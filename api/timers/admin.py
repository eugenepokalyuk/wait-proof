from django.contrib import admin, messages
from django.db import transaction
from django.utils import timezone

from common.time import format_duration

from .models import Side, Timer, Wait


class WaitInline(admin.TabularInline):
    model = Wait
    fk_name = "timer"
    extra = 0
    max_num = 0
    can_delete = False
    ordering = ["-started_at"]
    fields = ["waiter", "waited_for", "started_at", "ended_at", "duration", "end_reason", "counts"]
    readonly_fields = fields

    @admin.display(description="Длительность")
    def duration(self, obj):
        return format_duration(obj.duration_seconds) if obj.duration_seconds is not None else "идёт"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("waiter", "waited_for")


@admin.register(Timer)
class TimerAdmin(admin.ModelAdmin):
    list_display = ["__str__", "left_user", "right_user", "state", "reminder_minutes", "created_at", "archived_at"]
    list_filter = ["state", "archived_at"]
    search_fields = ["left_user__email", "right_user__email", "left_label", "right_label"]
    raw_id_fields = ["left_user", "right_user", "created_by"]
    readonly_fields = [
        "pair_key",
        "state",
        "version",
        "last_action_at",
        "last_action_by",
        "last_opened_wait",
        "last_closed_wait",
        "created_at",
    ]
    inlines = [WaitInline]
    actions = ["stop_wait"]

    @admin.action(description="Снять ожидание")
    def stop_wait(self, request, queryset):
        now = timezone.now()
        stopped = 0
        for timer in queryset:
            with transaction.atomic():
                timer = Timer.objects.select_for_update().get(pk=timer.pk)
                wait = timer.waits.filter(ended_at__isnull=True).first()
                if wait is None:
                    continue
                wait.close(now, Wait.EndReason.ADMIN)
                timer.state = Side.NONE
                timer.version += 1
                timer.last_action_at = None
                timer.last_action_by = None
                timer.last_opened_wait = None
                timer.last_closed_wait = None
                timer.save()
                stopped += 1
        self.message_user(request, f"Снято ожиданий: {stopped}", messages.SUCCESS)


@admin.register(Wait)
class WaitAdmin(admin.ModelAdmin):
    """Здесь разбирают спор: правят длительность и то, идёт ли ожидание в счёт"""

    list_display = ["timer", "waiter", "waited_for", "started_at", "duration", "end_reason", "counts"]
    list_filter = ["end_reason", "counts"]
    search_fields = ["waiter__email", "waited_for__email"]
    raw_id_fields = ["timer", "waiter", "waited_for", "started_by", "ended_by"]
    date_hierarchy = "started_at"

    @admin.display(description="Длительность", ordering="duration_seconds")
    def duration(self, obj):
        return format_duration(obj.duration_seconds) if obj.duration_seconds is not None else "идёт"
