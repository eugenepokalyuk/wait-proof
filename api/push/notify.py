"""Какие пуши уходят на какие события и с каким текстом.

Сюда приходят только id: функции вызываются после коммита, часто в другом
потоке, и объекты из запроса могли устареть. Всё перечитывается из базы
"""

from enum import StrEnum

from django.utils import timezone

from common.time import format_clock, format_duration

from . import sender


class Event(StrEnum):
    STARTED = "started"
    SWITCHED = "switched"
    STOPPED = "stopped"
    UNDONE = "undone"
    REMINDER = "reminder"
    AUTO_CLOSED = "auto_closed"
    FRIEND_REQUEST = "friend_request"
    FRIEND_ADDED = "friend_added"


class _SafeDict(dict):
    """Опечатка в подстановке из админки не должна ронять рассылку"""

    def __missing__(self, key):
        return "{" + key + "}"


def render(template: str, **values) -> str:
    return template.format_map(_SafeDict(values))


def _name(user) -> str:
    return user.display_name if user else "Удалённый пользователь"


def _timer_url(timer_id: int) -> str:
    # Относительный путь: service worker сам добавит адрес приложения
    return f"timer/?id={timer_id}"


def timer_event(event, timer_id, actor_id, device_id, opened_id, closed_id):
    sender.dispatch(_timer_event, event, timer_id, actor_id, device_id, opened_id, closed_id)


def _timer_event(event, timer_id, actor_id, device_id, opened_id, closed_id):
    from accounts.models import User
    from siteconf.models import SiteSettings
    from timers.models import Timer, Wait

    timer = Timer.objects.select_related("left_user", "right_user").filter(pk=timer_id).first()
    if timer is None:
        return
    conf = SiteSettings.get()
    actor = User.objects.filter(pk=actor_id).first()
    opened = Wait.objects.select_related("waiter", "waited_for").filter(pk=opened_id).first() if opened_id else None
    closed = Wait.objects.select_related("waiter", "waited_for").filter(pk=closed_id).first() if closed_id else None

    for user in (timer.left_user, timer.right_user):
        if user is None:
            continue
        values = {"actor": _name(actor)}
        if opened is not None:
            values |= {
                "waiter": _name(opened.waiter),
                "waited_for": _name(opened.waited_for),
                "since": format_clock(opened.started_at, user.timezone),
            }
        if closed is not None:
            prefix = "prev_" if event == Event.SWITCHED else ""
            values |= {
                f"{prefix}waiter": _name(closed.waiter),
                f"{prefix}waited_for": _name(closed.waited_for),
                f"{prefix}duration": format_duration(closed.duration_seconds or 0),
            }

        title_tpl, body_tpl = {
            Event.STARTED: (conf.push_started_title, conf.push_started_body),
            Event.SWITCHED: (conf.push_switched_title, conf.push_switched_body),
            Event.STOPPED: (conf.push_stopped_title, conf.push_stopped_body),
            Event.UNDONE: (conf.push_undone_title, conf.push_undone_body),
        }[event]

        message = {
            "title": render(title_tpl, **values),
            "body": render(body_tpl, **values),
            "tag": f"timer-{timer.id}",
            "url": _timer_url(timer.id),
            "timer_id": timer.id,
            "kind": str(event),
        }
        # Устройство, с которого щёлкнули, пропускаем — только у самого
        # щёлкнувшего; у второго участника тот же device_id невозможен,
        # но фильтр по пользователю защищает от совпадения
        exclude = device_id if user.id == actor_id else ""
        sender.send_to_user(user.id, str(event), message, exclude_device=exclude)


def reminder(wait_id: int):
    from siteconf.models import SiteSettings
    from timers.models import Wait

    wait = Wait.objects.select_related("waiter", "waited_for", "timer").filter(pk=wait_id).first()
    if wait is None or wait.waited_for is None or not wait.waited_for.notify_reminders:
        return
    conf = SiteSettings.get()
    user = wait.waited_for
    values = {
        "waiter": _name(wait.waiter),
        "waited_for": _name(wait.waited_for),
        "since": format_clock(wait.started_at, user.timezone),
        "duration": format_duration(int((timezone.now() - wait.started_at).total_seconds())),
    }
    sender.send_to_user(
        user.id,
        Event.REMINDER,
        {
            "title": render(conf.push_reminder_title, **values),
            "body": render(conf.push_reminder_body, **values),
            "tag": f"timer-{wait.timer_id}",
            "url": _timer_url(wait.timer_id),
            "timer_id": wait.timer_id,
            "kind": str(Event.REMINDER),
        },
    )


def auto_closed(timer_id: int, wait_id: int):
    sender.dispatch(_auto_closed, timer_id, wait_id)


def _auto_closed(timer_id: int, wait_id: int):
    from siteconf.models import SiteSettings
    from timers.models import Timer

    timer = Timer.objects.filter(pk=timer_id).first()
    if timer is None:
        return
    conf = SiteSettings.get()
    message = {
        "title": render(conf.push_auto_closed_title, hours=conf.auto_close_hours),
        "body": render(conf.push_auto_closed_body, hours=conf.auto_close_hours),
        "tag": f"timer-{timer.id}",
        "url": _timer_url(timer.id),
        "timer_id": timer.id,
        "kind": str(Event.AUTO_CLOSED),
    }
    for user_id in timer.participant_ids():
        sender.send_to_user(user_id, Event.AUTO_CLOSED, message)


def friend_request(to_user_id: int, from_user_id: int):
    sender.dispatch(_friend, Event.FRIEND_REQUEST, to_user_id, from_user_id)


def friend_added(to_user_id: int, friend_id: int):
    sender.dispatch(_friend, Event.FRIEND_ADDED, to_user_id, friend_id)


def _friend(event, to_user_id, other_id):
    from accounts.models import User
    from siteconf.models import SiteSettings

    to_user = User.objects.filter(pk=to_user_id, is_active=True).first()
    other = User.objects.filter(pk=other_id).first()
    if to_user is None or other is None or not to_user.notify_friends:
        return
    conf = SiteSettings.get()
    template = conf.push_friend_request_title if event == Event.FRIEND_REQUEST else conf.push_friend_added_title
    sender.send_to_user(
        to_user.id,
        str(event),
        {
            "title": render(template, name=_name(other)),
            "body": "",
            "tag": "friends",
            "url": "friends/",
            "kind": str(event),
        },
    )


def test_push(user_id: int) -> int:
    return sender.send_to_user(
        user_id,
        "test",
        {"title": "🔔 Пуши работают", "body": "Так будут выглядеть уведомления.", "tag": "test", "url": "", "kind": "test"},
    )
