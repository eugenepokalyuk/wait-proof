from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Avg, Count, Max, Sum

from .models import Timer, Wait

PERIODS = ("week", "month", "all")


def period_start(period: str, tz_name: str, now: datetime) -> datetime | None:
    """Начало недели или месяца в часовом поясе того, кто смотрит.

    Иначе ожидание в воскресенье в 23:30 по Москве попадало бы в следующую
    неделю по UTC, и у двоих в разных поясах счёт недели бы не сходился
    """
    if period == "all":
        return None
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    local = now.astimezone(tz)
    if period == "week":
        day = local.date() - timedelta(days=local.weekday())
    else:
        day = local.date().replace(day=1)
    return datetime.combine(day, time.min, tzinfo=tz)


def _side_stats(waits, user_id) -> dict:
    agg = waits.filter(waiter_id=user_id).aggregate(
        waited_seconds=Sum("duration_seconds"),
        times=Count("id"),
        avg_seconds=Avg("duration_seconds"),
        max_seconds=Max("duration_seconds"),
    )
    return {
        "waited_seconds": agg["waited_seconds"] or 0,
        "times": agg["times"] or 0,
        "avg_seconds": int(agg["avg_seconds"] or 0),
        "max_seconds": agg["max_seconds"] or 0,
    }


def timer_stats(timer: Timer, period: str, tz_name: str, now: datetime) -> dict:
    """Счёт: сколько ждал каждый.

    По людям, а не по сторонам: после «Поменять местами» левый стал правым,
    а его прошлые ожидания остались его
    """
    waits = Wait.objects.filter(timer=timer, counts=True, ended_at__isnull=False)
    start = period_start(period, tz_name, now)
    if start is not None:
        waits = waits.filter(started_at__gte=start)

    empty = {"waited_seconds": 0, "times": 0, "avg_seconds": 0, "max_seconds": 0}
    return {
        "period": period,
        "since": start,
        "left": _side_stats(waits, timer.left_user_id) if timer.left_user_id else empty,
        "right": _side_stats(waits, timer.right_user_id) if timer.right_user_id else empty,
    }
