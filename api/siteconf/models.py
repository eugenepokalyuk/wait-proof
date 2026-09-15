from django.db import models

from common.models import Singleton

PLACEHOLDERS_HELP = (
    "Подстановки: {waiter} — кто ждёт, {waited_for} — кого ждут, {actor} — кто щёлкнул, "
    "{since} — время начала, {duration} — сколько длилось, {prev_waiter}, {prev_waited_for}, "
    "{prev_duration} — прошлое ожидание при смене стороны, {name} — имя друга, {hours} — часы автозакрытия."
)


class SiteSettings(Singleton):
    """Всё, что меняется без выкатки: правила и тексты пушей.

    Тексты с именами участников, а не «ты/тебя»: пуш уходит обоим, включая
    другие устройства того, кто щёлкнул, и формулировка должна быть верна
    для каждого получателя
    """

    auto_close_hours = models.PositiveSmallIntegerField(
        "Автозакрытие через, ч",
        default=12,
        help_text="Забытое ожидание закрывается само и в счёт не идёт.",
    )
    undo_seconds = models.PositiveSmallIntegerField("Отменить можно в течение, с", default=10)
    poll_interval_seconds = models.PositiveSmallIntegerField(
        "Опрос таймера, с",
        default=5,
        help_text="Как часто открытое приложение спрашивает сервер о положении тумблера.",
    )

    push_started_title = models.CharField("Началось: заголовок", max_length=120, default="⏳ {waiter} ждёт")
    push_started_body = models.CharField("Началось: текст", max_length=200, default="Кого: {waited_for} · с {since} · включил(а) {actor}")
    push_switched_title = models.CharField(
        "Сменили сторону: заголовок", max_length=120, default="🔁 Теперь ждёт {waiter}"
    )
    push_switched_body = models.CharField(
        "Сменили сторону: текст", max_length=200, default="Кого: {waited_for} · до этого {prev_waiter} ждал(а) {prev_duration}"
    )
    push_stopped_title = models.CharField("Сняли: заголовок", max_length=120, default="🎉 Дождались")
    push_stopped_body = models.CharField(
        "Сняли: текст", max_length=200, default="{waited_for} опоздал(а) на {duration}"
    )
    push_undone_title = models.CharField("Отмена: заголовок", max_length=120, default="↩️ Отменено")
    push_undone_body = models.CharField("Отмена: текст", max_length=200, default="{actor} отменил(а) последний щелчок")
    push_reminder_title = models.CharField(
        "Напоминание: заголовок", max_length=120, default="⏰ {waiter} ждёт уже {duration}"
    )
    push_reminder_body = models.CharField("Напоминание: текст", max_length=200, default="С {since}")
    push_auto_closed_title = models.CharField(
        "Автозакрытие: заголовок", max_length=120, default="Ожидание закрыто автоматически"
    )
    push_auto_closed_body = models.CharField(
        "Автозакрытие: текст", max_length=200, default="Таймер простоял больше {hours} ч — в счёт не идёт"
    )
    push_friend_request_title = models.CharField(
        "Заявка в друзья: заголовок", max_length=120, default="👋 {name} хочет добавить тебя в друзья"
    )
    push_friend_added_title = models.CharField(
        "Новый друг: заголовок", max_length=120, default="🤝 {name} теперь в друзьях"
    )

    class Meta:
        verbose_name = "Настройки"
        verbose_name_plural = "Настройки"

    def __str__(self):
        return "Настройки"


for _field in SiteSettings._meta.fields:
    if _field.name.startswith("push_"):
        _field.help_text = PLACEHOLDERS_HELP
