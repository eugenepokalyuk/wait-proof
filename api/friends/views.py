from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from accounts.models import User
from common.codes import normalize_code
from push import notify
from timers.models import Timer

from .models import FriendRequest
from .serializers import FriendRequestCreateSerializer, InviteSerializer, person
from .services import accept_request, friendship_of, make_friends, remove_friend, send_request


def friend_payload(friendship, me) -> dict:
    other = friendship.other(me)
    timer = Timer.active_between(me, other).only("id").first()
    return {**person(other), "since": friendship.created_at, "timer_id": timer.id if timer else None}


class FriendListView(APIView):
    def get(self, request):
        friendships = friendship_of(request.user).order_by("-created_at")
        return Response([friend_payload(f, request.user) for f in friendships])


class FriendDetailView(APIView):
    def delete(self, request, user_id: int):
        friend = get_object_or_404(User, pk=user_id)
        with transaction.atomic():
            if not remove_friend(request.user, friend):
                return Response({"detail": "Такого друга нет."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class FriendRequestListView(APIView):
    def get_throttles(self):
        if self.request.method == "POST":
            self.throttle_scope = "friends_request"
            return [ScopedRateThrottle(), UserRateThrottle()]
        return super().get_throttles()

    def get(self, request):
        pending = FriendRequest.Status.PENDING
        incoming = (
            FriendRequest.objects.filter(to_user=request.user, status=pending)
            .select_related("from_user")
            .order_by("-created_at")
        )
        outgoing = FriendRequest.objects.filter(from_user=request.user, status=pending).order_by("-created_at")
        return Response(
            {
                "incoming": [
                    {"id": r.id, "user": person(r.from_user), "created_at": r.created_at} for r in incoming
                ],
                # Только почта: имя выдало бы, что человек уже зарегистрирован
                "outgoing": [{"id": r.id, "email": r.to_email, "created_at": r.created_at} for r in outgoing],
            }
        )

    def post(self, request):
        serializer = FriendRequestCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            send_request(request.user, serializer.validated_data["email"])
        return Response(
            {"detail": "Заявка отправлена. Как только человек её примет, вы станете друзьями."},
            status=status.HTTP_202_ACCEPTED,
        )


class FriendRequestAcceptView(APIView):
    def post(self, request, pk: int):
        friend_request = get_object_or_404(
            FriendRequest, pk=pk, to_user=request.user, status=FriendRequest.Status.PENDING
        )
        with transaction.atomic():
            friendship = accept_request(friend_request)
        return Response(friend_payload(friendship, request.user))


class FriendRequestDeclineView(APIView):
    def post(self, request, pk: int):
        friend_request = get_object_or_404(
            FriendRequest, pk=pk, to_user=request.user, status=FriendRequest.Status.PENDING
        )
        friend_request.status = FriendRequest.Status.DECLINED
        friend_request.responded_at = timezone.now()
        friend_request.save(update_fields=["status", "responded_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class FriendRequestDetailView(APIView):
    def delete(self, request, pk: int):
        friend_request = get_object_or_404(
            FriendRequest, pk=pk, from_user=request.user, status=FriendRequest.Status.PENDING
        )
        friend_request.status = FriendRequest.Status.CANCELLED
        friend_request.responded_at = timezone.now()
        friend_request.save(update_fields=["status", "responded_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class InviteAcceptView(APIView):
    """Приём ссылки-приглашения.

    Дружба создаётся сразу, без подтверждения: владелец сам отправил ссылку,
    это и есть согласие. Перевыпуск кода в профиле закрывает старую ссылку
    """

    throttle_classes = [ScopedRateThrottle, UserRateThrottle]
    throttle_scope = "friends_request"

    def post(self, request):
        serializer = InviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = normalize_code(serializer.validated_data["code"])

        owner = User.objects.filter(invite_code=code, is_active=True).first() if code else None
        if owner is None:
            return Response(
                {"detail": "Ссылка не работает — возможно, её перевыпустили. Попроси новую."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if owner == request.user:
            return Response(
                {"detail": "Это твоя собственная ссылка. Отправь её другу."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            friendship, created = make_friends(request.user, owner)
            if created:
                owner_id, me_id = owner.id, request.user.id
                transaction.on_commit(lambda: notify.friend_added(owner_id, me_id))

        return Response({**friend_payload(friendship, request.user), "created": created})
