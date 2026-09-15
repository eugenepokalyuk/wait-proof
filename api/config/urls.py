from django.contrib import admin
from django.urls import include, path

from common.views import HealthView
from siteconf.views import ConfigView

api = [
    path("health", HealthView.as_view(), name="health"),
    path("config", ConfigView.as_view(), name="config"),
    path("", include("accounts.urls")),
    path("", include("friends.urls")),
    path("", include("timers.urls")),
    path("", include("push.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api)),
]
