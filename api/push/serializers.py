from rest_framework import serializers


class KeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField(max_length=200)
    auth = serializers.CharField(max_length=100)


class SubscriptionSerializer(serializers.Serializer):
    device_id = serializers.CharField(max_length=64)
    endpoint = serializers.URLField(max_length=1000)
    keys = KeysSerializer()
    user_agent = serializers.CharField(max_length=300, required=False, allow_blank=True)

    def validate_endpoint(self, value):
        # Только https: подписка на произвольный http-адрес превратила бы
        # сервер в инструмент для запросов куда угодно
        if not value.startswith("https://"):
            raise serializers.ValidationError("Адрес подписки должен быть https.")
        return value


class UnsubscribeSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=1000)
