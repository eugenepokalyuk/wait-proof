"""Переключение тумблера и всё, что его меняет.

Логика живёт здесь, а не во вьюхах и не в save() модели: её же вызывают
команда tick (автозакрытие) и удаление аккаунта. Любое изменение положения —
только через эти функции, иначе где-то забудут закрыть ожидание или поднять
версию, и два телефона разойдутся во мнении, кто кого ждёт
"""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound

from common.errors import Conflict
from push import notify
from siteconf.models import SiteSettings

from .models import Side, Timer, Wait


def lock_timer(timer_id: int, user) -> Timer:
    """Таймер под блокировкой строки.

    Чужой или архивный — 404, а не 403: чужой id не должен подтверждать,
    что такой таймер вообще существует
    """
    timer = (
        Timer.objects.select_for_update()
        .select_related("left_user", "right_user")
        .filter(pk=timer_id, archived_at__isnull=True)
        .first()
    )
    if timer is None or not timer.is_participant(user):
        raise NotFound("Таймер не найден.")
    return timer


def _conflict(timer: Timer, message: str):
    from .serializers import timer_payload

    return Conflict(message, payload={"timer": timer_payload(timer)})


def _open_wait(timer: Timer) -> Wait | None:
    return timer.waits.filter(ended_at__isnull=True).first()


def switch(timer_id: int, actor, waiting_for: str, version: int, device_id: str = "") -> Timer:
    with transaction.atomic():
        timer = lock_timer(timer_id, actor)

        if timer.version != version:
            name = timer.last_action_by.display_name if timer.last_action_by else "Кто-то"
            raise _conflict(timer, f"{name} уже переключил(а) тумблер.")

        if timer.state == waiting_for:
            return timer

        if waiting_for != Side.NONE and timer.user_on(waiting_for) is None:
            raise _conflict(timer, "Второго участника больше нет в приложении.")

        now = timezone.now()
        previous_state = timer.state
        closed = _open_wait(timer)
        if closed is not None:
            reason = Wait.EndReason.SWITCHED if waiting_for != Side.NONE else Wait.EndReason.STOPPED
            closed.close(now, reason, by=actor)

        opened = None
        if waiting_for != Side.NONE:
            waited_for = timer.user_on(waiting_for)
            waiter = timer.right_user if waiting_for == Side.LEFT else timer.left_user
            opened = Wait.objects.create(
                timer=timer,
                waited_for=waited_for,
                waiter=waiter,
                started_at=now,
                started_by=actor,
            )

        timer.state = waiting_for
        timer.version += 1
        timer.last_action_at = now
        timer.last_action_by = actor
        timer.last_opened_wait = opened
        timer.last_closed_wait = closed
        timer.save(
            update_fields=[
                "state",
                "version",
                "last_action_at",
                "last_action_by",
                "last_opened_wait",
                "last_closed_wait",
            ]
        )

        if previous_state == Side.NONE:
            event = notify.Event.STARTED
        elif waiting_for == Side.NONE:
            event = notify.Event.STOPPED
        else:
            event = notify.Event.SWITCHED

        opened_id = opened.id if opened else None
        closed_id = closed.id if closed else None
        transaction.on_commit(
            lambda: notify.timer_event(event, timer.id, actor.id, device_id, opened_id, closed_id)
        )
        return timer


def undo(timer_id: int, actor, version: int, device_id: str = "") -> Timer:
    """Отмена последнего щелчка.

    Промах пальцем не должен попасть в счёт, поэтому открытое ожидание не
    закрывается, а помечается отменённым, и закрытое щелчком — открывается
    обратно, как будто щелчка не было. Отменяет только тот, кто щёлкнул,
    и только пока после него никто ничего не менял (версия та же)
    """
    with transaction.atomic():
        timer = lock_timer(timer_id, actor)
        conf = SiteSettings.get()
        now = timezone.now()

        if (
            timer.version != version
            or timer.last_action_by_id != actor.id
            or timer.last_action_at is None
            or now - timer.last_action_at > timedelta(seconds=conf.undo_seconds)
        ):
            raise _conflict(timer, "Отменить уже нельзя.")

        opened, closed = timer.last_opened_wait, timer.last_closed_wait

        # Порядок важен: сначала гасим открытое, потом открываем закрытое —
        # иначе на мгновение будет два открытых и база откажет
        if opened is not None:
            opened.close(now, Wait.EndReason.UNDONE, by=actor, counts=False)

        if closed is not None:
            closed.ended_at = None
            closed.duration_seconds = None
            closed.ended_by = None
            closed.end_reason = ""
            closed.counts = True
            closed.save(update_fields=["ended_at", "duration_seconds", "ended_by", "end_reason", "counts"])
            timer.state = Side.LEFT if closed.waited_for_id == timer.left_user_id else Side.RIGHT
        else:
            timer.state = Side.NONE

        timer.version += 1
        timer.last_action_at = None
        timer.last_action_by = None
        timer.last_opened_wait = None
        timer.last_closed_wait = None
        timer.save(
            update_fields=[
                "state",
                "version",
                "last_action_at",
                "last_action_by",
                "last_opened_wait",
                "last_closed_wait",
            ]
        )

        transaction.on_commit(
            lambda: notify.timer_event(notify.Event.UNDONE, timer.id, actor.id, device_id, None, None)
        )
        return timer


def swap_sides(timer_id: int, actor) -> Timer:
    with transaction.atomic():
        timer = lock_timer(timer_id, actor)
        timer.left_user, timer.right_user = timer.right_user, timer.left_user
        timer.left_label, timer.right_label = timer.right_label, timer.left_label
        if timer.state != Side.NONE:
            timer.state = Side.RIGHT if timer.state == Side.LEFT else Side.LEFT
        timer.version += 1
        # Отмена после перестановки вернула бы сторону, которой уже нет
        timer.last_action_at = None
        timer.last_action_by = None
        timer.last_opened_wait = None
        timer.last_closed_wait = None
        timer.save()
        return timer


def _archive(timer: Timer, now):
    wait = _open_wait(timer)
    if wait is not None:
        wait.close(now, Wait.EndReason.ARCHIVED, counts=False)
    timer.state = Side.NONE
    timer.archived_at = now
    timer.version += 1
    timer.save(update_fields=["state", "archived_at", "version"])


def archive(timer_id: int, actor) -> None:
    with transaction.atomic():
        _archive(lock_timer(timer_id, actor), timezone.now())


def archive_timers_between(u1, u2) -> None:
    now = timezone.now()
    for timer in Timer.active_between(u1, u2).select_for_update():
        _archive(timer, now)


def forget_user(user) -> None:
    """Перед удалением аккаунта: общие таймеры — в архив.

    Сами ожидания остаются: у второго участника не должна пропасть история.
    Ссылки на удалённого обнулятся базой (SET_NULL), в ленте он станет
    «Удалённым пользователем»
    """
    now = timezone.now()
    for timer in Timer.active_for(user).select_for_update():
        _archive(timer, now)


def auto_close_stale(now=None) -> int:
    """Закрывает забытые ожидания. Возвращает, сколько закрыто"""
    now = now or timezone.now()
    conf = SiteSettings.get()
    border = now - timedelta(hours=conf.auto_close_hours)
    closed = 0

    stale_ids = list(
        Wait.objects.filter(ended_at__isnull=True, started_at__lt=border).values_list("timer_id", flat=True)
    )
    for timer_id in stale_ids:
        with transaction.atomic():
            timer = Timer.objects.select_for_update(skip_locked=True).filter(pk=timer_id).first()
            if timer is None:
                continue
            wait = timer.waits.filter(ended_at__isnull=True, started_at__lt=border).first()
            if wait is None:
                continue
            wait.close(now, Wait.EndReason.AUTO_CLOSED, counts=False)
            timer.state = Side.NONE
            timer.version += 1
            timer.last_action_at = None
            timer.last_action_by = None
            timer.last_opened_wait = None
            timer.last_closed_wait = None
            timer.save()
            closed += 1
            wait_id = wait.id
            transaction.on_commit(lambda t=timer.id, w=wait_id: notify.auto_closed(t, w))
    return closed


def send_reminders(now=None) -> int:
    now = now or timezone.now()
    sent = 0
    waits = Wait.objects.filter(ended_at__isnull=True, timer__reminder_minutes__gt=0).select_related("timer")
    for wait in waits:
        last = wait.last_reminder_at or wait.started_at
        if now - last < timedelta(minutes=wait.timer.reminder_minutes):
            continue
        # Условное обновление вместо блокировки: если два процесса tick
        # наложились, напоминание уйдёт только от того, кто успел первым
        updated = Wait.objects.filter(
            pk=wait.pk, ended_at__isnull=True, last_reminder_at=wait.last_reminder_at
        ).update(last_reminder_at=now)
        if updated:
            notify.reminder(wait.id)
            sent += 1
    return sent
