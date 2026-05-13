"""
Serializers for geo-matching models.
"""

from rest_framework import serializers
from .models import BuyerPreference, BuyerFarmerMatch, Crop, BuyerPreferredCrop
from smc_backend.apps.users.serializers import UserListSerializer


class BuyerPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for buyer crop preferences."""

    preferred_crops = serializers.ListField(
        child=serializers.CharField(), required=False
    )

    class Meta:
        model = BuyerPreference
        fields = [
            'id', 'buyer', 'preferred_crops', 'search_radius_km',
            'min_rating', 'notify_on_match', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'buyer', 'created_at', 'updated_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['preferred_crops'] = list(instance.buyer.preferred_crops_rel.values_list('crop__name', flat=True))
        return ret

    def update(self, instance, validated_data):
        preferred_crops = validated_data.pop('preferred_crops', None)
        instance = super().update(instance, validated_data)

        if preferred_crops is not None:
            # clear existing
            instance.buyer.preferred_crops_rel.all().delete()
            for crop_name in preferred_crops:
                if crop_name:
                    crop, _ = Crop.objects.get_or_create(name=crop_name.strip())
                    BuyerPreferredCrop.objects.create(buyer=instance.buyer, crop=crop)
        return instance

    def create(self, validated_data):
        preferred_crops = validated_data.pop('preferred_crops', [])
        instance = super().create(validated_data)
        for crop_name in preferred_crops:
            if crop_name:
                crop, _ = Crop.objects.get_or_create(name=crop_name.strip())
                BuyerPreferredCrop.objects.create(buyer=instance.buyer, crop=crop)
        return instance


class BuyerFarmerMatchSerializer(serializers.ModelSerializer):
    """Serializer for buyer-farmer match records."""

    buyer_detail = UserListSerializer(source='buyer', read_only=True)
    farmer_detail = UserListSerializer(source='farmer', read_only=True)

    class Meta:
        model = BuyerFarmerMatch
        fields = [
            'id', 'buyer', 'buyer_detail', 'farmer', 'farmer_detail',
            'distance_km', 'match_score', 'is_active',
            'interaction_count', 'created_at', 'last_interaction',
        ]
        read_only_fields = fields
