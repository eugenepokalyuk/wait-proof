from zoneinfo import available_timezones

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models

from common.codes import INVITE_CODE_LEN, random_code


def validate_timezone(value: str):
    if value not in available_timezones():
        raise ValidationError("Неизвестный часовой пояс.")


class UserManager(BaseUserManager):
    """Менеджер под вход по почте: username у модели нет вовсе"""

    use_in_migrations = True

    def _create(self, email, password, **extra):
        if not email:
            raise ValueError("Нужна почта")
        user = self.model(email=normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self._create(email, password, **extra)


def normalize_email(email: str) -> str:
    """Почта целиком в нижнем регистре.

    Штатный normalize_email Django опускает только домен. Но «Katya@» и
    «katya@» для человека один ящик, и вторая регистрация на тот же адрес
    с другим регистром — это две учётки и потерянные друзья
    """
    return (email or "").strip().lower()


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField("Почта", unique=True)
    name = models.CharField("Имя", max_length=40)
    invite_code = models.CharField(
        "Код приглашения",
        max_length=INVITE_CODE_LEN,
        unique=True,
        editable=False,
        help_text="Входит в ссылку-приглашение. Перевыпуск делает старую ссылку недействительной.",
    )
    timezone = models.CharField(
        "Часовой пояс",
        max_length=64,
        default="Europe/Moscow",
        validators=[validate_timezone],
        help_text="Приходит с устройства. По нему считаются границы недели и месяца в счёте.",
    )
    notify_reminders = models.BooleanField("Пуши-напоминания", default=True)
    notify_friends = models.BooleanField("Пуши о друзьях", default=True)
    email_verified = models.BooleanField(
        "Почта подтверждена",
        default=False,
        help_text="Задел на будущее: писем пока нет, подтверждать нечем.",
    )

    is_active = models.BooleanField("Активен", default=True)
    is_staff = models.BooleanField("Доступ в админку", default=False)
    date_joined = models.DateTimeField("Регистрация", auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.name} <{self.email}>" if self.name else self.email

    @property
    def display_name(self) -> str:
        return self.name or self.email.split("@")[0]

    def save(self, *args, **kwargs):
        if not self.invite_code:
            self.invite_code = self.new_invite_code()
        super().save(*args, **kwargs)

    @classmethod
    def new_invite_code(cls) -> str:
        # Совпадение из 10^12 почти невозможно, но цена проверки — один запрос
        while True:
            code = random_code()
            if not cls.objects.filter(invite_code=code).exists():
                return code

    def rotate_invite_code(self):
        self.invite_code = self.new_invite_code()
        self.save(update_fields=["invite_code"])
