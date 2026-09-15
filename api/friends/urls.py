from django.urls import path

from .views import (
    FriendDetailView,
    FriendListView,
    FriendRequestAcceptView,
    FriendRequestDeclineView,
    FriendRequestDetailView,
    FriendRequestListView,
    InviteAcceptView,
)

urlpatterns = [
    path("friends", FriendListView.as_view(), name="friends"),
    path("friends/requests", FriendRequestListView.as_view(), name="friend-requests"),
    path("friends/requests/<int:pk>", FriendRequestDetailView.as_view(), name="friend-request"),
    path("friends/requests/<int:pk>/accept", FriendRequestAcceptView.as_view(), name="friend-request-accept"),
    path("friends/requests/<int:pk>/decline", FriendRequestDeclineView.as_view(), name="friend-request-decline"),
    path("friends/invite", InviteAcceptView.as_view(), name="friend-invite"),
    path("friends/<int:user_id>", FriendDetailView.as_view(), name="friend"),
]
