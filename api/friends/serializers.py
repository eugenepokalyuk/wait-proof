from rest_framework import serializers

from accounts.models import normalize_email


class FriendRequestCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)

    def validate_email(self, value):
        email = normalize_email(value)
        if email == self.context["request"].user.email:
            raise serializers.ValidationError("Это твоя почта.")
        return email


class InviteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=32)


def person(user) -> dict:
    return {"id": user.id, "name": user.display_name, "email": user.email}
