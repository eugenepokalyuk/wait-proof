from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer


def issue_tokens(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }


def revoke_all_tokens(user):
    """Отзывает все refresh-токены пользователя.

    После смены пароля старый пароль мог быть у кого-то ещё — вместе с ним
    должны перестать работать и сессии, открытые этим паролем
    """
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
