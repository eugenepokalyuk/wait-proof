from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import User


class UserCreateForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("email", "name")


class UserEditForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Пользователи.

    «Забыл пароль» решается здесь: писем нет, поэтому новый пароль задаёт
    администратор ссылкой «форма смены пароля» под полем пароля
    """

    form = UserEditForm
    add_form = UserCreateForm

    list_display = ["email", "name", "date_joined", "is_active", "is_staff"]
    list_filter = ["is_active", "is_staff"]
    search_fields = ["email", "name", "invite_code"]
    ordering = ["-date_joined"]
    readonly_fields = ["invite_code", "date_joined", "last_login"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Профиль", {"fields": ("name", "timezone", "invite_code")}),
        ("Уведомления", {"fields": ("notify_reminders", "notify_friends")}),
        ("Доступ", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Даты", {"fields": ("date_joined", "last_login", "email_verified")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "name", "password1", "password2")}),
    )
