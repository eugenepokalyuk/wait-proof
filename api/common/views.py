from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Проверка для деплоя: жив ли процесс и отвечает ли база.

    Деплой смотрит сюда снаружи, через nginx Формы, — так проверяется вся
    цепочка, а не только то, что контейнер запущен
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"ok": True})
