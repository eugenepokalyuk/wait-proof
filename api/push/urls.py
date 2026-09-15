from django.urls import path

from .views import SubscriptionDetailView, SubscriptionListView, TestPushView

urlpatterns = [
    path("push/subscriptions", SubscriptionListView.as_view(), name="push-subscriptions"),
    path("push/subscriptions/<int:pk>", SubscriptionDetailView.as_view(), name="push-subscription"),
    path("push/test", TestPushView.as_view(), name="push-test"),
]
