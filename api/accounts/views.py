from django.contrib.auth import authenticate
from django.core.cache import cache
from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from friends.services import attach_pending_requests
from timers.services import forget_user

from .models import User
from .serializers import (
    LoginSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    PasswordConfirmSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .tokens import issue_tokens, revoke_all_tokens

#: Неудачные входы на одну почту. Лимит по IP не спасает, когда перебирают
#: пароль одного человека с разных адресов
LOGIN_FAILS_LIMIT = 5
LOGIN_FAILS_WINDOW = 15 * 60


def _fails_key(email: str) -> str:
    return f"login-fails:{email}"


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            user = User.objects.create_user(
                email=data["email"],
                password=data["password"],
                name=data["name"],
                timezone=data.get("timezone") or "Europe/Moscow",
            )
            # Кто-то мог позвать этого человека в друзья до регистрации —
            # заявки ждали его почту и теперь становятся входящими
            attach_pending_requests(user)

        return Response(issue_tokens(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        key = _fails_key(email)

        if cache.get(key, 0) >= LOGIN_FAILS_LIMIT:
            return Response(
                {"detail": "Слишком много попыток. Попробуйте через 15 минут."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user = authenticate(request, email=email, password=serializer.validated_data["password"])
        if user is None:
            # Одна фраза на «нет такой почты» и «не тот пароль»: форма входа
            # не должна подсказывать, какая половина угадана
            cache.set(key, cache.get(key, 0) + 1, LOGIN_FAILS_WINDOW)
            return Response(
                {"detail": "Неверная почта или пароль."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache.delete(key)
        return Response(issue_tokens(user))


class RefreshView(APIView):
    """Обновление пары токенов.

    Своя вьюха вместо TokenRefreshView ради одного: заблокированный в
    админке пользователь не должен продолжать жить на старом refresh
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refresh = RefreshToken(serializer.validated_data["refresh"])
            user = User.objects.filter(pk=refresh["user_id"], is_active=True).first()
            if user is None:
                raise TokenError("user inactive")
            # Ротация: старый refresh уходит в чёрный список, выдаётся новый
            refresh.blacklist()
        except TokenError:
            return Response(
                {"detail": "Сессия истекла. Войдите заново."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(issue_tokens(user))


class LogoutView(APIView):
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            # Уже истёк или отозван — цель выхода и так достигнута
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    http_method_names = ["get", "patch"]

    def get_object(self):
        return self.request.user


class RotateInviteCodeView(APIView):
    def post(self, request):
        request.user.rotate_invite_code()
        return Response(UserSerializer(request.user).data)


class PasswordChangeView(APIView):
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        # Все прежние сессии гасим, текущему устройству выдаём новую пару —
        # человек, сменивший пароль, не должен тут же вылететь сам
        revoke_all_tokens(user)
        return Response(issue_tokens(user))


class DeleteAccountView(APIView):
    def post(self, request):
        serializer = PasswordConfirmSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        with transaction.atomic():
            forget_user(user)
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
