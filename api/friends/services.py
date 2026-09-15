from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from push import notify

from .models import FriendRequest, Friendship


def _ordered(u1, u2):
    return (u1, u2) if u1.id < u2.id else (u2, u1)


def are_friends(u1, u2) -> bool:
    a, b = _ordered(u1, u2)
    return Friendship.objects.filter(user_a=a, user_b=b).exists()


def friendship_of(user):
    return Friendship.objects.filter(Q(user_a=user) | Q(user_b=user)).select_related("user_a", "user_b")


def make_friends(u1, u2) -> tuple[Friendship, bool]:
    """Дружба между двумя людьми. Повторный вызов ничего не ломает.

    Заодно закрываются встречные заявки: если Катя позвала Диму по почте, а
    Дима добавился по её ссылке, висящая заявка больше ничего не значит
    """
    a, b = _ordered(u1, u2)
    try:
        with transaction.atomic():
            friendship, created = Friendship.objects.get_or_create(user_a=a, user_b=b)
    except IntegrityError:
        friendship, created = Friendship.objects.get(user_a=a, user_b=b), False

    FriendRequest.objects.filter(
        Q(from_user=u1, to_user=u2) | Q(from_user=u2, to_user=u1),
        status=FriendRequest.Status.PENDING,
    ).update(status=FriendRequest.Status.ACCEPTED, responded_at=timezone.now())
    return friendship, created


def send_request(from_user, email: str) -> None:
    """Заявка по почте.

    Ничего не возвращает намеренно: снаружи ответ одинаковый для
    зарегистрированной почты и нет, иначе форма «добавить друга» стала бы
    способом проверить, есть ли человек в приложении
    """
    from accounts.models import User

    to_user = User.objects.filter(email=email, is_active=True).first()
    if to_user is not None and (to_user == from_user or are_friends(from_user, to_user)):
        return

    # Встречная заявка уже есть — оба хотят дружить, спрашивать некого
    if to_user is not None:
        counter = FriendRequest.objects.filter(
            from_user=to_user, to_user=from_user, status=FriendRequest.Status.PENDING
        ).first()
        if counter is not None:
            make_friends(from_user, to_user)
            transaction.on_commit(lambda: notify.friend_added(to_user.id, from_user.id))
            return

    request, created = FriendRequest.objects.get_or_create(
        from_user=from_user,
        to_email=email,
        status=FriendRequest.Status.PENDING,
        defaults={"to_user": to_user},
    )
    if created and to_user is not None:
        transaction.on_commit(lambda: notify.friend_request(to_user.id, from_user.id))


def accept_request(request: FriendRequest) -> Friendship:
    friendship, _ = make_friends(request.from_user, request.to_user)
    request.status = FriendRequest.Status.ACCEPTED
    request.responded_at = timezone.now()
    request.save(update_fields=["status", "responded_at"])
    from_id, to_id = request.from_user_id, request.to_user_id
    transaction.on_commit(lambda: notify.friend_added(from_id, to_id))
    return friendship


def attach_pending_requests(user) -> None:
    """При регистрации забираем заявки, которые ждали эту почту"""
    FriendRequest.objects.filter(
        to_email=user.email, to_user__isnull=True, status=FriendRequest.Status.PENDING
    ).update(to_user=user)


def remove_friend(user, friend) -> bool:
    from timers.services import archive_timers_between

    a, b = _ordered(user, friend)
    deleted, _ = Friendship.objects.filter(user_a=a, user_b=b).delete()
    if deleted:
        archive_timers_between(user, friend)
    return bool(deleted)
