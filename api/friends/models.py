from django.conf import settings
from django.db import models
from django.db.models import F, Q


class FriendRequest(models.Model):
    """Заявка в друзья по почте.

    Адресат может быть ещё не зарегистрирован: тогда `to_user` пуст, а заявка
    ждёт его почту и становится входящей в момент регистрации
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Ждёт ответа"
        ACCEPTED = "accepted", "Принята"
        DECLINED = "declined", "Отклонена"
        CANCELLED = "cancelled", "Отменена"

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="outgoing_requests",
        verbose_name="От кого",
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="incoming_requests",
        verbose_name="Кому",
    )
    to_email = models.EmailField("Почта адресата")
    status = models.CharField("Статус", max_length=16, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField("Создана", auto_now_add=True)
    responded_at = models.DateTimeField("Ответ", null=True, blank=True)

    class Meta:
        verbose_name = "Заявка в друзья"
        verbose_name_plural = "Заявки в друзья"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["from_user", "to_email"],
                condition=Q(status="pending"),
                name="one_pending_request_per_email",
            )
        ]

    def __str__(self):
        return f"{self.from_user} → {self.to_email}"


class Friendship(models.Model):
    """Дружба — всегда взаимная, поэтому одна строка на пару.

    Меньший id всегда в `user_a`: иначе пара (Катя, Дима) и (Дима, Катя)
    легла бы двумя строками, и уникальность пришлось бы проверять руками
    """

    user_a = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+", verbose_name="Первый"
    )
    user_b = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+", verbose_name="Второй"
    )
    created_at = models.DateTimeField("С какого времени", auto_now_add=True)

    class Meta:
        verbose_name = "Дружба"
        verbose_name_plural = "Дружба"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user_a", "user_b"], name="unique_friendship"),
            models.CheckConstraint(condition=Q(user_a__lt=F("user_b")), name="friendship_ordered"),
        ]

    def __str__(self):
        return f"{self.user_a} ⇄ {self.user_b}"

    def other(self, user):
        return self.user_b if self.user_a_id == user.id else self.user_a
