from django.contrib import admin

from .models import FriendRequest, Friendship


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ["user_a", "user_b", "created_at"]
    search_fields = ["user_a__email", "user_a__name", "user_b__email", "user_b__name"]
    raw_id_fields = ["user_a", "user_b"]


@admin.register(FriendRequest)
class FriendRequestAdmin(admin.ModelAdmin):
    list_display = ["from_user", "to_email", "to_user", "status", "created_at", "responded_at"]
    list_filter = ["status"]
    search_fields = ["from_user__email", "to_email"]
    raw_id_fields = ["from_user", "to_user"]
