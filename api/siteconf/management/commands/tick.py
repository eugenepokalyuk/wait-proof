import logging
import signal
import time
from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.utils import timezone

from push.models import PushLog
from timers.services import auto_close_stale, send_reminders

log = logging.getLogger(__name__)

INTERVAL_SECONDS = 60
CLEANUP_EVERY = timedelta(hours=24)
PUSH_LOG_KEEP = timedelta(days=30)


class Command(BaseCommand):
    help = "Напоминания, автозакрытие забытых ожиданий и чистка. С --loop — раз в минуту, без конца"

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true", help="Работать постоянно (для контейнера)")

    def handle(self, *args, loop=False, **options):
        self._stop = False
        if loop:
            # docker stop шлёт SIGTERM: доделываем текущий проход и выходим,
            # а не обрываем рассылку посередине
            signal.signal(signal.SIGTERM, self._request_stop)
            signal.signal(signal.SIGINT, self._request_stop)

        last_cleanup = None
        while True:
            started = time.monotonic()
            close_old_connections()
            try:
                now = timezone.now()
                closed = auto_close_stale(now)
                reminded = send_reminders(now)
                if closed or reminded:
                    log.info("tick: закрыто %s, напоминаний %s", closed, reminded)
                if last_cleanup is None or now - last_cleanup >= CLEANUP_EVERY:
                    self._cleanup(now)
                    last_cleanup = now
            except Exception:
                # Сбой одного прохода не должен останавливать напоминания
                # навсегда — следующий проход попробует снова
                log.exception("tick failed")

            if not loop or self._stop:
                return
            self._sleep(INTERVAL_SECONDS - (time.monotonic() - started))
            if self._stop:
                return

    def _cleanup(self, now):
        PushLog.objects.filter(created_at__lt=now - PUSH_LOG_KEEP).delete()
        call_command("flushexpiredtokens")

    def _request_stop(self, *_):
        self._stop = True

    def _sleep(self, seconds: float):
        deadline = time.monotonic() + max(0.0, seconds)
        while not self._stop and time.monotonic() < deadline:
            time.sleep(0.5)
