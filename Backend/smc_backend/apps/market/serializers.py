"""
Serializers for market prices and trend data.
"""

from rest_framework import serializers
from .models import MarketPrice


class MarketPriceSerializer(serializers.ModelSerializer):
    """Full market price record — used by the existing ReadOnly ViewSet."""

    class Meta:
        model = MarketPrice
        fields = [
            "id", "crop_name", "category", "market",
            "unit_price", "unit",
            "min_price", "max_price", "average_price",
            "price_trend", "source",
            "recorded_at", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LivePriceSerializer(serializers.Serializer):
    """
    Response shape for the live /api/market/live-price/ endpoint.
    Mirrors the PriceRecord TypedDict from the service layer.
    """
    commodity = serializers.CharField()
    market = serializers.CharField()
    price = serializers.FloatField()
    currency = serializers.CharField()
    source = serializers.CharField()
    timestamp = serializers.CharField()
    fallback_used = serializers.BooleanField()
    # Blended-only extras (optional)
    external_price = serializers.FloatField(required=False)
    farmer_avg_price = serializers.FloatField(required=False)
    blend_weights = serializers.DictField(required=False)


class TrendPointSerializer(serializers.Serializer):
    date = serializers.CharField()
    price = serializers.FloatField()


class PriceTrendSerializer(serializers.Serializer):
    """Response shape for the /api/market/price-trends/ endpoint."""
    commodity = serializers.CharField()
    market = serializers.CharField()
    period_days = serializers.IntegerField()
    data = TrendPointSerializer(many=True)
    trend = serializers.CharField()
