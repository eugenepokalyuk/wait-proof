from django.contrib import admin, messages

from . import notify
from .models import PushLog, PushSubscription


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "user_agent", "created_at", "last_success_at", "fail_count"]
    search_fields = ["user__email", "user_agent"]
    raw_id_fields = ["user"]
    readonly_fields = ["endpoint", "p256dh", "auth", "device_id", "created_at", "last_success_at"]
    actions = ["send_test"]

    @admin.action(description="Отправить проверочный пуш владельцам")
    def send_test(self, request, queryset):
        delivered = sum(notify.test_push(uid) for uid in set(queryset.values_list("user_id", flat=True)))
        self.message_user(request, f"Доставлено: {delivered}", messages.INFO)


@admin.register(PushLog)
class PushLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "user", "kind", "title", "status_code", "short_error"]
    list_filter = ["kind", "status_code"]
    search_fields = ["user__email", "title"]
    date_hierarchy = "created_at"

    @admin.display(description="Ошибка")
    def short_error(self, obj):
        return obj.error[:80]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
