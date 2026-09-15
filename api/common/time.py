from datetime import datetime
from zoneinfo import ZoneInfo


def plural(n: int, one: str, few: str, many: str) -> str:
    n = abs(n) % 100
    if 11 <= n <= 14:
        return many
    n %= 10
    if n == 1:
        return one
    if 2 <= n <= 4:
        return few
    return many


def format_duration(seconds: int) -> str:
    """«40 с», «23 мин», «1 ч 5 мин» — так, как это сказал бы человек.

    Секунды показываем только для совсем коротких: «ждал 0 мин» звучит как
    ошибка, а «ждал 1 ч 5 мин 12 с» — как протокол
    """
    seconds = max(0, int(seconds))
    if seconds < 60:
        return f"{seconds} с"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} мин"
    hours, minutes = divmod(minutes, 60)
    return f"{hours} ч {minutes} мин" if minutes else f"{hours} ч"


def format_clock(moment: datetime, tz_name: str) -> str:
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    return moment.astimezone(tz).strftime("%H:%M")
