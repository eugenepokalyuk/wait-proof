from django.contrib import admin
from django.shortcuts import redirect

from .models import SiteSettings


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Правила", {"fields": ("auto_close_hours", "undo_seconds", "poll_interval_seconds")}),
        (
            "Тексты пушей",
            {
                "fields": (
                    ("push_started_title", "push_started_body"),
                    ("push_switched_title", "push_switched_body"),
                    ("push_stopped_title", "push_stopped_body"),
                    ("push_undone_title", "push_undone_body"),
                    ("push_reminder_title", "push_reminder_body"),
                    ("push_auto_closed_title", "push_auto_closed_body"),
                    "push_friend_request_title",
                    "push_friend_added_title",
                )
            },
        ),
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        # Список из одной строки не нужен — сразу форма
        return redirect("admin:siteconf_sitesettings_change", SiteSettings.get().pk)
