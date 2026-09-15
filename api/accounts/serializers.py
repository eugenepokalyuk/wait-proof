from django.conf import settings
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User, normalize_email, validate_timezone


def check_password_rules(password: str, user: User):
    try:
        password_validation.validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"password": list(exc.messages)})


class UserSerializer(serializers.ModelSerializer):
    invite_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "invite_code",
            "invite_url",
            "timezone",
            "notify_reminders",
            "notify_friends",
        ]
        read_only_fields = ["id", "email", "invite_code", "invite_url"]

    def get_invite_url(self, user) -> str:
        return f"{settings.APP_URL}/invite/?code={user.invite_code}"

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Имя не может быть пустым.")
        return value


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False)
    name = serializers.CharField(max_length=40)
    timezone = serializers.CharField(max_length=64, required=False)

    def validate_email(self, value):
        email = normalize_email(value)
        # Для приложения на двоих удобство важнее, чем скрыть факт
        # регистрации: человек должен понять, что ему нужен вход, а не
        # гадать, почему «не регистрирует»
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Эта почта уже зарегистрирована. Войдите.")
        return email

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Как тебя зовут?")
        return value

    def validate_timezone(self, value):
        try:
            validate_timezone(value)
        except DjangoValidationError:
            return "Europe/Moscow"
        return value

    def validate(self, attrs):
        check_password_rules(attrs["password"], User(email=attrs["email"], name=attrs["name"]))
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False)

    def validate_email(self, value):
        return normalize_email(value)


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(max_length=128, trim_whitespace=False)
    new_password = serializers.CharField(max_length=128, trim_whitespace=False)
    refresh = serializers.CharField(required=False, allow_blank=True)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Текущий пароль неверный.")
        return value

    def validate(self, attrs):
        check_password_rules(attrs["new_password"], self.context["request"].user)
        return attrs


class PasswordConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(max_length=128, trim_whitespace=False)

    def validate_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Пароль неверный.")
        return value


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
