from datetime import timedelta
from unittest import mock

from django.utils import timezone

from timers import services
from timers.models import Side, Timer, Wait

from .base import ApiCase


class CreateTests(ApiCase):
    def test_create_only_with_friend_and_once(self):
        katya, dima, timer = self.pair()
        timer.delete()
        self.login(katya)
        r = self.client.post("/api/v1/timers", {"friend_id": dima.id, "left": "me"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["left"]["label"], "Катя")
        again = self.client.post("/api/v1/timers", {"friend_id": dima.id}, format="json")
        self.assertEqual(again.status_code, 400)
        self.assertEqual(again.data["timer_id"], r.data["id"])

        stranger = self.user("x@example.com", "Икс")
        r = self.client.post("/api/v1/timers", {"friend_id": stranger.id}, format="json")
        self.assertEqual(r.status_code, 400)


class SwitchTests(ApiCase):
    def switch(self, timer_id, side, version, device=""):
        headers = {"HTTP_X_DEVICE_ID": device} if device else {}
        return self.client.post(
            f"/api/v1/timers/{timer_id}/switch", {"waiting_for": side, "version": version}, format="json", **headers
        )

    def test_start_switch_stop(self):
        katya, dima, timer = self.pair()
        self.login(dima)

        r = self.switch(timer.id, "left", 0)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["state"], "left")
        self.assertIsNotNone(r.data["current_wait"])
        self.assertEqual(r.data["undo"]["by"], dima.id)
        wait = Wait.objects.get()
        self.assertEqual((wait.waiter, wait.waited_for), (dima, katya))

        r = self.switch(timer.id, "right", 1)
        self.assertEqual(r.data["state"], "right")
        wait.refresh_from_db()
        self.assertEqual(wait.end_reason, Wait.EndReason.SWITCHED)

        r = self.switch(timer.id, "none", 2)
        self.assertEqual(r.data["state"], "none")
        self.assertIsNone(r.data["current_wait"])
        self.assertEqual(Wait.objects.filter(ended_at__isnull=True).count(), 0)

    def test_conflict_returns_current_state(self):
        katya, dima, timer = self.pair()
        self.login(katya)
        self.switch(timer.id, "left", 0)
        self.login(dima)
        r = self.switch(timer.id, "right", 0)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["timer"]["state"], "left")
        self.assertIn("Катя", r.data["detail"])

    def test_stranger_gets_404(self):
        _, _, timer = self.pair()
        self.login(self.user("x@example.com", "Икс"))
        self.assertEqual(self.client.get(f"/api/v1/timers/{timer.id}").status_code, 404)
        self.assertEqual(self.switch(timer.id, "left", 0).status_code, 404)

    def test_same_state_is_idempotent(self):
        _, dima, timer = self.pair()
        self.login(dima)
        self.switch(timer.id, "left", 0)
        r = self.switch(timer.id, "left", 1)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["version"], 1)


class UndoTests(ApiCase):
    def test_undo_start(self):
        _, dima, timer = self.pair()
        self.login(dima)
        self.client.post(f"/api/v1/timers/{timer.id}/switch", {"waiting_for": "left", "version": 0}, format="json")
        r = self.client.post(f"/api/v1/timers/{timer.id}/undo", {"version": 1}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["state"], "none")
        wait = Wait.objects.get()
        self.assertEqual(wait.end_reason, Wait.EndReason.UNDONE)
        self.assertFalse(wait.counts)

    def test_undo_switch_reopens_previous(self):
        _, dima, timer = self.pair()
        self.login(dima)
        self.client.post(f"/api/v1/timers/{timer.id}/switch", {"waiting_for": "left", "version": 0}, format="json")
        first = Wait.objects.get()
        self.client.post(f"/api/v1/timers/{timer.id}/switch", {"waiting_for": "right", "version": 1}, format="json")
        r = self.client.post(f"/api/v1/timers/{timer.id}/undo", {"version": 2}, format="json")
        self.assertEqual(r.data["state"], "left")
        self.assertEqual(r.data["current_wait"]["id"], first.id)
        first.refresh_from_db()
        self.assertIsNone(first.ended_at)

    def test_undo_stop_reopens(self):
        _, dima, timer = self.pair()
        self.login(dima)
        self.client.post(f"/api/v1/timers/{timer.id}/switch", {"waiting_for": "right", "version": 0}, format="json")
        self.client.post(f"/api/v1/timers/{timer.id}/switch", {"waiting_for": "none", "version": 1}, format="json")
        r = self.client.post(f"/api/v1/timers/{timer.id}/undo", {"version": 2}, format="json")
        self.assertEqual(r.data["state"], "right")

    def test_only_actor_and_only_in_time(self):
        katya, dima, timer = self.pair()
        self.login(dima)
        self.client.post(f"/api/v1/timers/{timer.id}/switch", {"waiting_for": "left", "version": 0}, format="json")
        self.login(katya)
        self.assertEqual(self.client.post(f"/api/v1/timers/{timer.id}/undo", {"version": 1}, format="json").status_code, 409)

        Timer.objects.filter(pk=timer.pk).update(last_action_at=timezone.now() - timedelta(seconds=30))
        self.login(dima)
        self.assertEqual(self.client.post(f"/api/v1/timers/{timer.id}/undo", {"version": 1}, format="json").status_code, 409)


class StatsTests(ApiCase):
    def test_stats_by_person_skip_uncounted(self):
        katya, dima, timer = self.pair()
        now = timezone.now()
        Wait.objects.create(timer=timer, waiter=dima, waited_for=katya, started_at=now - timedelta(minutes=30),
                            ended_at=now - timedelta(minutes=10), duration_seconds=1200)
        Wait.objects.create(timer=timer, waiter=katya, waited_for=dima, started_at=now - timedelta(minutes=9),
                            ended_at=now - timedelta(minutes=8), duration_seconds=60)
        Wait.objects.create(timer=timer, waiter=katya, waited_for=dima, started_at=now - timedelta(minutes=7),
                            ended_at=now - timedelta(minutes=6), duration_seconds=60, counts=False)
        self.login(katya)
        r = self.client.get(f"/api/v1/timers/{timer.id}/stats?period=all")
        self.assertEqual(r.data["left"]["waited_seconds"], 60)
        self.assertEqual(r.data["right"]["waited_seconds"], 1200)

        services.swap_sides(timer.id, katya)
        r = self.client.get(f"/api/v1/timers/{timer.id}/stats?period=all")
        self.assertEqual(r.data["left"]["waited_seconds"], 1200)

    def test_waits_feed_paginates_and_hides_undone(self):
        katya, dima, timer = self.pair()
        now = timezone.now()
        for i in range(35):
            Wait.objects.create(timer=timer, waiter=dima, waited_for=katya, started_at=now - timedelta(hours=i + 1),
                                ended_at=now - timedelta(hours=i), duration_seconds=3600)
        Wait.objects.create(timer=timer, waiter=dima, waited_for=katya, started_at=now, ended_at=now,
                            duration_seconds=0, end_reason=Wait.EndReason.UNDONE, counts=False)
        self.login(katya)
        page = self.client.get(f"/api/v1/timers/{timer.id}/waits").data
        self.assertEqual(len(page["results"]), 30)
        rest = self.client.get(f"/api/v1/timers/{timer.id}/waits?before={page['next']}").data
        self.assertEqual(len(rest["results"]), 5)
        self.assertIsNone(rest["next"])


class TickTests(ApiCase):
    def test_auto_close(self):
        katya, dima, timer = self.pair()
        services.switch(timer.id, dima, Side.LEFT, 0)
        Wait.objects.update(started_at=timezone.now() - timedelta(hours=13))
        self.assertEqual(services.auto_close_stale(), 1)
        timer.refresh_from_db()
        self.assertEqual(timer.state, Side.NONE)
        wait = Wait.objects.get()
        self.assertEqual(wait.end_reason, Wait.EndReason.AUTO_CLOSED)
        self.assertFalse(wait.counts)

    def test_reminders_respect_interval(self):
        katya, dima, timer = self.pair()
        services.switch(timer.id, dima, Side.LEFT, 0)
        with mock.patch("push.notify.reminder") as reminder:
            self.assertEqual(services.send_reminders(), 0)
            Wait.objects.update(started_at=timezone.now() - timedelta(minutes=16))
            self.assertEqual(services.send_reminders(), 1)
            self.assertEqual(services.send_reminders(), 0)
            reminder.assert_called_once()
