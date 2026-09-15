from django.core.cache import cache
from rest_framework.test import APITestCase

from accounts.models import User
from friends.services import make_friends
from timers.models import Timer

PASSWORD = "длинный-пароль-42"


class ApiCase(APITestCase):
    def setUp(self):
        # Лимиты считаются в кэше; без очистки тесты упирались бы в них
        cache.clear()

    def user(self, email="katya@example.com", name="Катя", **extra) -> User:
        return User.objects.create_user(email=email, password=PASSWORD, name=name, **extra)

    def login(self, user):
        self.client.force_authenticate(user)

    def pair(self):
        katya = self.user()
        dima = self.user("dima@example.com", "Дима")
        make_friends(katya, dima)
        timer = Timer.objects.create(
            left_user=katya,
            right_user=dima,
            left_label="Она",
            right_label="Он",
            pair_key=Timer.make_pair_key(katya.id, dima.id),
            created_by=katya,
        )
        return katya, dima, timer
