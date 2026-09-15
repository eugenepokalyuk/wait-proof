from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from accounts.models import User
from friends.services import are_friends

from . import services
from .models import Timer, Wait
from .serializers import (
    SwitchSerializer,
    TimerCreateSerializer,
    TimerUpdateSerializer,
    UndoSerializer,
    timer_payload,
    wait_payload,
)
from .stats import PERIODS, timer_stats

WAITS_PAGE = 30


def device_id(request) -> str:
    return (request.headers.get("X-Device-Id") or "")[:64]


def get_timer(request, pk: int) -> Timer:
    timer = (
        Timer.objects.select_related("left_user", "right_user")
        .filter(pk=pk, archived_at__isnull=True)
        .first()
    )
    if timer is None or not timer.is_participant(request.user):
        raise NotFound("Таймер не найден.")
    return timer


class TimerListView(APIView):
    def get(self, request):
        timers = Timer.active_for(request.user).select_related("left_user", "right_user")
        return Response([timer_payload(t) for t in timers])

    def post(self, request):
        serializer = TimerCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        friend = get_object_or_404(User, pk=data["friend_id"], is_active=True)
        if friend == request.user or not are_friends(request.user, friend):
            return Response({"detail": "Таймер можно создать только с другом."}, status=status.HTTP_400_BAD_REQUEST)

        existing = Timer.active_between(request.user, friend).first()
        if existing is not None:
            return Response(
                {"detail": "С этим другом таймер уже есть.", "timer_id": existing.id},
                status=status.HTTP_400_BAD_REQUEST,
            )

        left, right = (request.user, friend) if data["left"] == "me" else (friend, request.user)
        try:
            with transaction.atomic():
                timer = Timer.objects.create(
                    left_user=left,
                    right_user=right,
                    left_label=(data.get("left_label") or "").strip() or left.display_name[:20],
                    right_label=(data.get("right_label") or "").strip() or right.display_name[:20],
                    pair_key=Timer.make_pair_key(left.id, right.id),
                    created_by=request.user,
                )
        except IntegrityError:
            # Двое создали таймер друг с другом одновременно — побеждает первый
            existing = Timer.active_between(request.user, friend).first()
            return Response(
                {"detail": "С этим другом таймер уже есть.", "timer_id": existing.id if existing else None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(timer_payload(timer), status=status.HTTP_201_CREATED)


class TimerDetailView(APIView):
    def get(self, request, pk: int):
        return Response(timer_payload(get_timer(request, pk)))

    def patch(self, request, pk: int):
        serializer = TimerUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            timer = services.lock_timer(pk, request.user)
            for field, value in serializer.validated_data.items():
                setattr(timer, field, value)
            timer.save()
        return Response(timer_payload(timer))

    def delete(self, request, pk: int):
        services.archive(pk, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TimerSwitchView(APIView):
    throttle_classes = [ScopedRateThrottle, UserRateThrottle]
    throttle_scope = "switch"

    def post(self, request, pk: int):
        serializer = SwitchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        timer = services.switch(
            pk,
            request.user,
            serializer.validated_data["waiting_for"],
            serializer.validated_data["version"],
            device_id(request),
        )
        return Response(timer_payload(timer))


class TimerUndoView(APIView):
    throttle_classes = [ScopedRateThrottle, UserRateThrottle]
    throttle_scope = "switch"

    def post(self, request, pk: int):
        serializer = UndoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        timer = services.undo(pk, request.user, serializer.validated_data["version"], device_id(request))
        return Response(timer_payload(timer))


class TimerSwapView(APIView):
    def post(self, request, pk: int):
        return Response(timer_payload(services.swap_sides(pk, request.user)))


class TimerWaitsView(APIView):
    """Лента ожиданий, от новых к старым.

    Курсор — id последнего показанного, а не номер страницы: пока человек
    листает, приходят новые ожидания, и страницы по номеру поехали бы
    """

    def get(self, request, pk: int):
        timer = get_timer(request, pk)
        waits = (
            Wait.objects.filter(timer=timer)
            .exclude(end_reason=Wait.EndReason.UNDONE)
            .select_related("waiter", "waited_for")
            .order_by("-id")
        )
        before = request.query_params.get("before")
        if before and before.isdigit():
            waits = waits.filter(id__lt=int(before))

        page = list(waits[: WAITS_PAGE + 1])
        has_more = len(page) > WAITS_PAGE
        page = page[:WAITS_PAGE]
        return Response(
            {"results": [wait_payload(w) for w in page], "next": page[-1].id if has_more else None}
        )


class TimerStatsView(APIView):
    def get(self, request, pk: int):
        timer = get_timer(request, pk)
        period = request.query_params.get("period", "week")
        if period not in PERIODS:
            period = "week"
        return Response(timer_stats(timer, period, request.user.timezone, timezone.now()))
