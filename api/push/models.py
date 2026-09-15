from django.conf import settings
from django.db import models


class PushSubscription(models.Model):
    """Подписка одного устройства на Web Push.

    `device_id` — случайный UUID, который приложение создаёт один раз и
    хранит у себя. По нему устройство, с которого щёлкнули, не получает пуш
    о собственном щелчке, а переподписка с того же телефона заменяет старую
    запись вместо того, чтобы копить мёртвые
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
        verbose_name="Пользователь",
    )
    device_id = models.CharField("Устройство", max_length=64)
    endpoint = models.URLField("Адрес пуш-сервиса", max_length=1000, unique=True)
    p256dh = models.CharField("Ключ p256dh", max_length=200)
    auth = models.CharField("Ключ auth", max_length=100)
    user_agent = models.CharField("Браузер", max_length=300, blank=True)
    created_at = models.DateTimeField("Подписан", auto_now_add=True)
    last_success_at = models.DateTimeField("Последняя доставка", null=True, blank=True)
    fail_count = models.PositiveSmallIntegerField("Ошибок подряд", default=0)

    class Meta:
        verbose_name = "Push-подписка"
        verbose_name_plural = "Push-подписки"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "device_id"], name="one_subscription_per_device"),
        ]

    def __str__(self):
        return f"{self.user} · {self.user_agent[:40] or self.device_id}"

    def as_webpush(self) -> dict:
        return {"endpoint": self.endpoint, "keys": {"p256dh": self.p256dh, "auth": self.auth}}


class PushLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+", verbose_name="Кому"
    )
    subscription = models.ForeignKey(
        PushSubscription, on_delete=models.SET_NULL, null=True, blank=True, related_name="+", verbose_name="Устройство"
    )
    kind = models.CharField("Событие", max_length=32)
    title = models.CharField("Заголовок", max_length=200)
    body = models.CharField("Текст", max_length=300, blank=True)
    status_code = models.PositiveSmallIntegerField("Код ответа", null=True, blank=True)
    error = models.TextField("Ошибка", blank=True)
    created_at = models.DateTimeField("Когда", auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Запись журнала пушей"
        verbose_name_plural = "Журнал пушей"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind} → {self.user}"
