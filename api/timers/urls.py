from django.urls import path

from .views import (
    TimerDetailView,
    TimerListView,
    TimerStatsView,
    TimerSwapView,
    TimerSwitchView,
    TimerUndoView,
    TimerWaitsView,
)

urlpatterns = [
    path("timers", TimerListView.as_view(), name="timers"),
    path("timers/<int:pk>", TimerDetailView.as_view(), name="timer"),
    path("timers/<int:pk>/switch", TimerSwitchView.as_view(), name="timer-switch"),
    path("timers/<int:pk>/undo", TimerUndoView.as_view(), name="timer-undo"),
    path("timers/<int:pk>/swap-sides", TimerSwapView.as_view(), name="timer-swap"),
    path("timers/<int:pk>/waits", TimerWaitsView.as_view(), name="timer-waits"),
    path("timers/<int:pk>/stats", TimerStatsView.as_view(), name="timer-stats"),
]
