from django.conf import settings
from django.db import models
from django.db.models import Q


class Side(models.TextChoices):
    NONE = "none", "Никто не ждёт"
    LEFT = "left", "Ждут левого"
    RIGHT = "right", "Ждут правого"


class Timer(models.Model):
    """Тумблер на двоих.

    Раскладка одна на обоих участников: «лево» у всех одно, иначе спор
    переехал бы в «а у меня она справа». Положение `state` — кого ждут
    """

    left_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
        verbose_name="Слева",
    )
    right_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
        verbose_name="Справа",
    )
    left_label = models.CharField("Подпись слева", max_length=20)
    right_label = models.CharField("Подпись справа", max_length=20)

    # «3:7» — пара id по возрастанию. Нужна ради одного ограничения: один
    # действующий таймер на пару людей, как бы они ни стояли по сторонам
    pair_key = models.CharField("Пара", max_length=41, editable=False)

    state = models.CharField("Положение", max_length=5, choices=Side.choices, default=Side.NONE)
    version = models.PositiveIntegerField(
        "Версия",
        default=0,
        help_text="Растёт на каждый щелчок. По ней ловится одновременное нажатие с двух телефонов.",
    )
    reminder_minutes = models.PositiveSmallIntegerField(
        "Напоминать каждые, мин",
        default=15,
        choices=[(0, "Не напоминать"), (15, "15"), (30, "30"), (60, "60")],
    )

    # Последний щелчок — ради кнопки «Отменить». Что он открыл и что закрыл,
    # чтобы отмена вернула всё ровно как было
    last_action_at = models.DateTimeField("Последний щелчок", null=True, blank=True)
    last_action_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    last_opened_wait = models.ForeignKey(
        "Wait", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    last_closed_wait = models.ForeignKey(
        "Wait", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
        verbose_name="Создал",
    )
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    archived_at = models.DateTimeField("В архиве с", null=True, blank=True)

    class Meta:
        verbose_name = "Таймер"
        verbose_name_plural = "Таймеры"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["pair_key"],
                condition=Q(archived_at__isnull=True),
                name="one_active_timer_per_pair",
            ),
        ]

    def __str__(self):
        return f"{self.left_label} ⇄ {self.right_label}"

    @staticmethod
    def make_pair_key(u1_id: int, u2_id: int) -> str:
        a, b = sorted((u1_id, u2_id))
        return f"{a}:{b}"

    @classmethod
    def active_for(cls, user):
        return cls.objects.filter(Q(left_user=user) | Q(right_user=user), archived_at__isnull=True)

    @classmethod
    def active_between(cls, u1, u2):
        return cls.objects.filter(pair_key=cls.make_pair_key(u1.id, u2.id), archived_at__isnull=True)

    def is_participant(self, user) -> bool:
        return user.id in (self.left_user_id, self.right_user_id)

    def user_on(self, side: str):
        return self.left_user if side == Side.LEFT else self.right_user

    def participant_ids(self) -> list[int]:
        return [uid for uid in (self.left_user_id, self.right_user_id) if uid]


class Wait(models.Model):
    """Одно ожидание: кто кого ждал, сколько, кто включил и кто снял."""

    class EndReason(models.TextChoices):
        STOPPED = "stopped", "Сняли"
        SWITCHED = "switched", "Переключили на другого"
        UNDONE = "undone", "Отменено"
        AUTO_CLOSED = "auto_closed", "Закрыто автоматически"
        ARCHIVED = "archived", "Таймер в архиве"
        ADMIN = "admin", "Закрыл администратор"

    timer = models.ForeignKey(Timer, on_delete=models.CASCADE, related_name="waits", verbose_name="Таймер")
    waited_for = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
        verbose_name="Кого ждали",
    )
    waiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
        verbose_name="Кто ждал",
    )
    started_at = models.DateTimeField("Начало")
    ended_at = models.DateTimeField("Конец", null=True, blank=True)
    duration_seconds = models.PositiveIntegerField("Длительность, с", null=True, blank=True)
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
        verbose_name="Включил",
    )
    ended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name="Снял",
        help_text="Пусто — закрыла система или администратор.",
    )
    end_reason = models.CharField("Причина", max_length=16, choices=EndReason.choices, blank=True)
    counts = models.BooleanField(
        "Идёт в счёт",
        default=True,
        help_text="Отменённые и закрытые автоматически в счёт не идут. Здесь администратор разбирает спор.",
    )
    last_reminder_at = models.DateTimeField("Последнее напоминание", null=True, blank=True)

    class Meta:
        verbose_name = "Ожидание"
        verbose_name_plural = "Ожидания"
        ordering = ["-started_at"]
        constraints = [
            # Два открытых ожидания на одном таймере — это сломанный счёт.
            # Ловим базой, а не кодом: код можно обойти из админки
            models.UniqueConstraint(
                fields=["timer"],
                condition=Q(ended_at__isnull=True),
                name="one_open_wait_per_timer",
            ),
        ]
        indexes = [models.Index(fields=["timer", "-started_at"])]

    def __str__(self):
        return f"{self.waiter} ждёт {self.waited_for} с {self.started_at:%d.%m %H:%M}"

    @property
    def is_open(self) -> bool:
        return self.ended_at is None

    def close(self, now, reason: str, by=None, counts: bool = True):
        self.ended_at = now
        self.duration_seconds = max(0, int((now - self.started_at).total_seconds()))
        self.end_reason = reason
        self.ended_by = by
        self.counts = counts
        self.save(update_fields=["ended_at", "duration_seconds", "end_reason", "ended_by", "counts"])
