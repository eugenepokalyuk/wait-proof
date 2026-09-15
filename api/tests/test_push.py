from unittest import mock

from django.test import override_settings

from push.models import PushLog, PushSubscription

from .base import ApiCase


def subscribe(user, device, endpoint):
    return PushSubscription.objects.create(
        user=user, device_id=device, endpoint=endpoint, p256dh="p", auth="a"
    )


@override_settings(VAPID_PRIVATE_KEY="test-key")
class PushTests(ApiCase):
    def test_subscribe_is_idempotent_per_device(self):
        katya = self.user()
        self.login(katya)
        body = {"device_id": "phone", "endpoint": "https://push.example/1", "keys": {"p256dh": "p", "auth": "a"}}
        self.assertEqual(self.client.post("/api/v1/push/subscriptions", body, format="json").status_code, 201)
        body["endpoint"] = "https://push.example/2"
        self.client.post("/api/v1/push/subscriptions", body, format="json")
        self.assertEqual(PushSubscription.objects.get().endpoint, "https://push.example/2")

    def test_http_endpoint_rejected(self):
        self.login(self.user())
        body = {"device_id": "phone", "endpoint": "http://push.example/1", "keys": {"p256dh": "p", "auth": "a"}}
        self.assertEqual(self.client.post("/api/v1/push/subscriptions", body, format="json").status_code, 400)

    def test_switch_pushes_everyone_except_tapping_device(self):
        katya, dima, timer = self.pair()
        subscribe(katya, "katya-phone", "https://push.example/k")
        subscribe(dima, "dima-phone", "https://push.example/d1")
        subscribe(dima, "dima-tablet", "https://push.example/d2")

        with mock.patch("push.sender.webpush") as webpush:
            webpush.return_value = mock.Mock(status_code=201)
            self.login(dima)
            with self.captureOnCommitCallbacks(execute=True):
                r = self.client.post(
                    f"/api/v1/timers/{timer.id}/switch",
                    {"waiting_for": "left", "version": 0},
                    format="json",
                    HTTP_X_DEVICE_ID="dima-phone",
                )
            self.assertEqual(r.status_code, 200)

        endpoints = sorted(call.kwargs["subscription_info"]["endpoint"] for call in webpush.call_args_list)
        self.assertEqual(endpoints, ["https://push.example/d2", "https://push.example/k"])
        log = PushLog.objects.filter(user=katya).get()
        self.assertEqual(log.title, "⏳ Дима ждёт")
        self.assertIn("Кого: Катя", log.body)

    def test_gone_subscription_removed(self):
        from pywebpush import WebPushException

        katya = self.user()
        subscribe(katya, "phone", "https://push.example/k")
        gone = WebPushException("gone", response=mock.Mock(status_code=410))
        with mock.patch("push.sender.webpush", side_effect=gone):
            from push import notify

            notify.test_push(katya.id)
        self.assertFalse(PushSubscription.objects.exists())
        self.assertEqual(PushLog.objects.get().status_code, 410)


class HealthTests(ApiCase):
    def test_health_and_config_open(self):
        self.assertEqual(self.client.get("/api/v1/health").data, {"ok": True})
        self.assertIn("undo_seconds", self.client.get("/api/v1/config").data)
