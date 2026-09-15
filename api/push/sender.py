"""Доставка пушей.

Отправка идёт в фоновом потоке после коммита: ответ на щелчок не должен
ждать серверов Apple и Google, которые иногда думают по секунде. Celery ради
этого не заводим — пушей единицы в минуту, пула на пару потоков хватает
"""

import json
import logging
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from django.db import close_old_connections
from django.utils import timezone
from pywebpush import WebPushException, webpush

from .models import PushLog, PushSubscription

log = logging.getLogger(__name__)

#: Столько ошибок подряд, кроме «подписки больше нет», — и подписка удаляется.
#: Разовый сбой пуш-сервиса не повод отписывать телефон
MAX_FAILS = 5

#: Сколько пуш-сервис держит сообщение для выключенного телефона. Час: пуш
#: «Дима ждёт» через сутки уже только сбивает с толку
TTL_SECONDS = 3600

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="push")


def dispatch(fn, *args):
    if not settings.PUSH_ASYNC:
        fn(*args)
        return

    def run():
        # У потока своё соединение с базой — его надо и открыть по-честному,
        # и закрыть, иначе соединения копятся до лимита Postgres
        close_old_connections()
        try:
            fn(*args)
        except Exception:
            log.exception("push dispatch failed")
        finally:
            close_old_connections()

    _executor.submit(run)


def send_to_user(user_id: int, kind: str, message: dict, exclude_device: str = "") -> int:
    """Отправляет пуш на все устройства пользователя. Возвращает число доставок"""
    subscriptions = PushSubscription.objects.filter(user_id=user_id)
    if exclude_device:
        subscriptions = subscriptions.exclude(device_id=exclude_device)

    delivered = 0
    for subscription in subscriptions:
        if deliver(subscription, kind, message):
            delivered += 1
    return delivered


def deliver(subscription: PushSubscription, kind: str, message: dict) -> bool:
    entry = PushLog(
        user_id=subscription.user_id,
        subscription=subscription,
        kind=kind,
        title=message.get("title", "")[:200],
        body=message.get("body", "")[:300],
    )

    if not settings.VAPID_PRIVATE_KEY:
        entry.error = "VAPID не настроен — пуш не отправлен."
        entry.save()
        return False

    try:
        response = webpush(
            subscription_info=subscription.as_webpush(),
            data=json.dumps(message, ensure_ascii=False),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
            ttl=TTL_SECONDS,
            timeout=10,
        )
    except WebPushException as exc:
        code = exc.response.status_code if exc.response is not None else None
        entry.status_code = code
        entry.error = str(exc)[:2000]
        entry.subscription = None if code in (404, 410) else subscription
        entry.save()
        if code in (404, 410):
            # Подписки больше нет: приложение удалили или отозвали разрешение
            subscription.delete()
        else:
            subscription.fail_count += 1
            if subscription.fail_count >= MAX_FAILS:
                entry.subscription = None
                entry.save(update_fields=["subscription"])
                subscription.delete()
            else:
                subscription.save(update_fields=["fail_count"])
        return False
    except Exception as exc:  # сеть, DNS, таймаут
        entry.error = f"{type(exc).__name__}: {exc}"[:2000]
        entry.save()
        return False

    entry.status_code = getattr(response, "status_code", None)
    entry.save()
    subscription.last_success_at = timezone.now()
    subscription.fail_count = 0
    subscription.save(update_fields=["last_success_at", "fail_count"])
    return True
