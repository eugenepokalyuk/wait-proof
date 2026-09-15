from django.urls import path

from .views import (
    DeleteAccountView,
    LoginView,
    LogoutView,
    MeView,
    PasswordChangeView,
    RefreshView,
    RegisterView,
    RotateInviteCodeView,
)

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/refresh", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("me", MeView.as_view(), name="me"),
    path("me/invite-code/rotate", RotateInviteCodeView.as_view(), name="me-invite-rotate"),
    path("me/password", PasswordChangeView.as_view(), name="me-password"),
    path("me/delete", DeleteAccountView.as_view(), name="me-delete"),
]
