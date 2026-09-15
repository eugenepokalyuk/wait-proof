from accounts.models import User

from .base import PASSWORD, ApiCase


class RegisterTests(ApiCase):
    def test_register_returns_tokens_and_lowercases_email(self):
        r = self.client.post(
            "/api/v1/auth/register",
            {"email": "Katya@Example.com", "password": PASSWORD, "name": " Катя "},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIn("access", r.data)
        self.assertEqual(r.data["user"]["email"], "katya@example.com")
        self.assertEqual(r.data["user"]["name"], "Катя")
        self.assertEqual(len(r.data["user"]["invite_code"]), 8)

    def test_taken_email(self):
        self.user()
        r = self.client.post(
            "/api/v1/auth/register",
            {"email": "KATYA@example.com", "password": PASSWORD, "name": "Катя"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("уже зарегистрирована", r.data["detail"])

    def test_weak_password(self):
        r = self.client.post(
            "/api/v1/auth/register",
            {"email": "a@example.com", "password": "12345678", "name": "Аня"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertTrue(r.data["detail"])


class LoginTests(ApiCase):
    def test_login_ok(self):
        self.user()
        r = self.client.post("/api/v1/auth/login", {"email": "KATYA@example.com", "password": PASSWORD}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIn("refresh", r.data)

    def test_same_error_for_unknown_email_and_wrong_password(self):
        self.user()
        wrong = self.client.post("/api/v1/auth/login", {"email": "katya@example.com", "password": "nope-nope"}, format="json")
        unknown = self.client.post("/api/v1/auth/login", {"email": "who@example.com", "password": "nope-nope"}, format="json")
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(wrong.data, unknown.data)

    def test_lockout_after_five_failures(self):
        self.user()
        for _ in range(5):
            self.client.post("/api/v1/auth/login", {"email": "katya@example.com", "password": "nope-nope"}, format="json")
        r = self.client.post("/api/v1/auth/login", {"email": "katya@example.com", "password": PASSWORD}, format="json")
        self.assertEqual(r.status_code, 429)

    def test_refresh_rotates_and_old_token_dies(self):
        self.user()
        tokens = self.client.post(
            "/api/v1/auth/login", {"email": "katya@example.com", "password": PASSWORD}, format="json"
        ).data
        first = self.client.post("/api/v1/auth/refresh", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(first.status_code, 200)
        again = self.client.post("/api/v1/auth/refresh", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(again.status_code, 401)


class ProfileTests(ApiCase):
    def test_password_change_revokes_old_sessions(self):
        katya = self.user()
        old = self.client.post(
            "/api/v1/auth/login", {"email": katya.email, "password": PASSWORD}, format="json"
        ).data
        self.login(katya)
        r = self.client.post(
            "/api/v1/me/password",
            {"old_password": PASSWORD, "new_password": "совсем-новый-пароль"},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.client.force_authenticate(None)
        dead = self.client.post("/api/v1/auth/refresh", {"refresh": old["refresh"]}, format="json")
        self.assertEqual(dead.status_code, 401)
        alive = self.client.post("/api/v1/auth/refresh", {"refresh": r.data["refresh"]}, format="json")
        self.assertEqual(alive.status_code, 200)

    def test_patch_me(self):
        katya = self.user()
        self.login(katya)
        r = self.client.patch("/api/v1/me", {"name": "Катюша", "timezone": "Asia/Novosibirsk"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        katya.refresh_from_db()
        self.assertEqual(katya.timezone, "Asia/Novosibirsk")

    def test_delete_account_keeps_history_for_friend(self):
        katya, dima, timer = self.pair()
        self.login(katya)
        self.client.post(f"/api/v1/timers/{timer.id}/switch", {"waiting_for": "right", "version": 0}, format="json")
        r = self.client.post("/api/v1/me/delete", {"password": PASSWORD}, format="json")
        self.assertEqual(r.status_code, 204)
        self.assertFalse(User.objects.filter(email="katya@example.com").exists())
        timer.refresh_from_db()
        self.assertIsNotNone(timer.archived_at)
        self.assertEqual(timer.waits.count(), 1)

    def test_endpoints_closed_without_token(self):
        self.assertEqual(self.client.get("/api/v1/me").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/timers").status_code, 401)
