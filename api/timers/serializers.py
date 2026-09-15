from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from siteconf.models import SiteSettings

from .models import Side, Timer, Wait

DELETED = "Удалённый пользователь"


def _side(user, label: str) -> dict:
    return {
        "user_id": user.id if user else None,
        "name": user.display_name if user else DELETED,
        "label": label,
    }


def timer_payload(timer: Timer, undo_seconds: int | None = None) -> dict:
    wait = timer.waits.filter(ended_at__isnull=True).first() if timer.state != Side.NONE else None
    if undo_seconds is None:
        undo_seconds = SiteSettings.get().undo_seconds

    undo = None
    if timer.last_action_at and timer.last_action_by_id:
        until = timer.last_action_at + timedelta(seconds=undo_seconds)
        if until > timezone.now():
            undo = {"until": until, "by": timer.last_action_by_id}

    return {
        "id": timer.id,
        "left": _side(timer.left_user, timer.left_label),
        "right": _side(timer.right_user, timer.right_label),
        "state": timer.state,
        "version": timer.version,
        "current_wait": (
            {"id": wait.id, "started_at": wait.started_at, "started_by": wait.started_by_id} if wait else None
        ),
        "undo": undo,
        "reminder_minutes": timer.reminder_minutes,
        "server_time": timezone.now(),
    }


def wait_payload(wait: Wait) -> dict:
    def who(user):
        return {"id": user.id, "name": user.display_name} if user else {"id": None, "name": DELETED}

    return {
        "id": wait.id,
        "waiter": who(wait.waiter),
        "waited_for": who(wait.waited_for),
        "started_at": wait.started_at,
        "ended_at": wait.ended_at,
        "duration_seconds": wait.duration_seconds,
        "started_by": wait.started_by_id,
        "ended_by": wait.ended_by_id,
        "end_reason": wait.end_reason,
        "counts": wait.counts,
    }


class TimerCreateSerializer(serializers.Serializer):
    friend_id = serializers.IntegerField()
    left = serializers.ChoiceField(choices=["me", "friend"], default="friend")
    left_label = serializers.CharField(max_length=20, required=False, allow_blank=True)
    right_label = serializers.CharField(max_length=20, required=False, allow_blank=True)


class TimerUpdateSerializer(serializers.Serializer):
    left_label = serializers.CharField(max_length=20, required=False)
    right_label = serializers.CharField(max_length=20, required=False)
    reminder_minutes = serializers.ChoiceField(choices=[0, 15, 30, 60], required=False)

    def validate_left_label(self, value):
        return self._label(value)

    def validate_right_label(self, value):
        return self._label(value)

    @staticmethod
    def _label(value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Подпись не может быть пустой.")
        return value


class SwitchSerializer(serializers.Serializer):
    waiting_for = serializers.ChoiceField(choices=Side.values)
    version = serializers.IntegerField(min_value=0)


class UndoSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=0)
