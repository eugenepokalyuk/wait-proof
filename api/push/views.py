from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import notify
from .models import PushSubscription
from .serializers import SubscriptionSerializer, UnsubscribeSerializer


def subscription_payload(s: PushSubscription) -> dict:
    return {
        "id": s.id,
        "device_id": s.device_id,
        "user_agent": s.user_agent,
        "created_at": s.created_at,
        "last_success_at": s.last_success_at,
    }


class SubscriptionListView(APIView):
    def get(self, request):
        subs = PushSubscription.objects.filter(user=request.user)
        return Response([subscription_payload(s) for s in subs])

    def post(self, request):
        """Подписка устройства. Приложение шлёт её при каждом запуске —
        поэтому запрос идемпотентный: тот же endpoint просто обновляется"""
        serializer = SubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            # Тот же браузерный endpoint мог остаться за другим пользователем,
            # если на телефоне вышли из одной учётки и вошли в другую
            PushSubscription.objects.filter(endpoint=data["endpoint"]).exclude(
                user=request.user, device_id=data["device_id"]
            ).delete()
            subscription, _ = PushSubscription.objects.update_or_create(
                user=request.user,
                device_id=data["device_id"],
                defaults={
                    "endpoint": data["endpoint"],
                    "p256dh": data["keys"]["p256dh"],
                    "auth": data["keys"]["auth"],
                    "user_agent": data.get("user_agent", ""),
                    "fail_count": 0,
                },
            )
        return Response(subscription_payload(subscription), status=status.HTTP_201_CREATED)

    def delete(self, request):
        serializer = UnsubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        PushSubscription.objects.filter(user=request.user, endpoint=serializer.validated_data["endpoint"]).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubscriptionDetailView(APIView):
    def delete(self, request, pk: int):
        get_object_or_404(PushSubscription, pk=pk, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TestPushView(APIView):
    def post(self, request):
        delivered = notify.test_push(request.user.id)
        if not delivered:
            return Response(
                {"detail": "Не доставлено ни на одно устройство. Включи уведомления и попробуй ещё раз."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"delivered": delivered})
