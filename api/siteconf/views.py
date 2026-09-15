from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SiteSettings


class ConfigView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        conf = SiteSettings.get()
        return Response(
            {
                "poll_interval_seconds": conf.poll_interval_seconds,
                "undo_seconds": conf.undo_seconds,
                "vapid_public_key": settings.VAPID_PUBLIC_KEY,
            }
        )
