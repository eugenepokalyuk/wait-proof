from friends.models import FriendRequest
from friends.services import are_friends

from .base import PASSWORD, ApiCase


class InviteTests(ApiCase):
    def test_invite_link_makes_friends_immediately(self):
        katya = self.user()
        dima = self.user("dima@example.com", "Дима")
        self.login(dima)
        code = katya.invite_code.lower()[:4] + "-" + katya.invite_code.lower()[4:]
        r = self.client.post("/api/v1/friends/invite", {"code": code}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(are_friends(katya, dima))
        self.assertEqual(self.client.get("/api/v1/friends").data[0]["name"], "Катя")

    def test_rotated_code_stops_working(self):
        katya = self.user()
        old = katya.invite_code
        katya.rotate_invite_code()
        self.login(self.user("dima@example.com", "Дима"))
        r = self.client.post("/api/v1/friends/invite", {"code": old}, format="json")
        self.assertEqual(r.status_code, 404)

    def test_own_code(self):
        katya = self.user()
        self.login(katya)
        r = self.client.post("/api/v1/friends/invite", {"code": katya.invite_code}, format="json")
        self.assertEqual(r.status_code, 400)


class RequestTests(ApiCase):
    def test_request_accept_flow(self):
        katya = self.user()
        dima = self.user("dima@example.com", "Дима")
        self.login(katya)
        r = self.client.post("/api/v1/friends/requests", {"email": "DIMA@example.com"}, format="json")
        self.assertEqual(r.status_code, 202)

        self.login(dima)
        incoming = self.client.get("/api/v1/friends/requests").data["incoming"]
        self.assertEqual(len(incoming), 1)
        r = self.client.post(f"/api/v1/friends/requests/{incoming[0]['id']}/accept")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(are_friends(katya, dima))

    def test_same_answer_for_unknown_email_and_binds_on_register(self):
        katya = self.user()
        self.login(katya)
        known = self.client.post("/api/v1/friends/requests", {"email": "katya2@example.com"}, format="json")
        self.assertEqual(known.status_code, 202)

        self.client.force_authenticate(None)
        r = self.client.post(
            "/api/v1/auth/register",
            {"email": "katya2@example.com", "password": PASSWORD, "name": "Вторая"},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(FriendRequest.objects.get().to_user.email, "katya2@example.com")

    def test_counter_request_makes_friends(self):
        katya = self.user()
        dima = self.user("dima@example.com", "Дима")
        self.login(katya)
        self.client.post("/api/v1/friends/requests", {"email": dima.email}, format="json")
        self.login(dima)
        self.client.post("/api/v1/friends/requests", {"email": katya.email}, format="json")
        self.assertTrue(are_friends(katya, dima))

    def test_remove_friend_archives_timer(self):
        katya, dima, timer = self.pair()
        self.login(katya)
        r = self.client.delete(f"/api/v1/friends/{dima.id}")
        self.assertEqual(r.status_code, 204)
        timer.refresh_from_db()
        self.assertIsNotNone(timer.archived_at)
