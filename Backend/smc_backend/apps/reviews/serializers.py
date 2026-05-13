"""
Serializers for reviews.
"""

from rest_framework import serializers
from .models import Review
from smc_backend.apps.users.serializers import UserListSerializer


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for reviews."""
    
    buyer_details = UserListSerializer(source='buyer', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'buyer', 'buyer_details', 'product', 'product_name',
            'rating', 'comment', 'verified_purchase',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'buyer', 'verified_purchase', 'created_at', 'updated_at']


class ReviewCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating reviews."""
    
    class Meta:
        model = Review
        fields = ['product', 'transaction', 'rating', 'comment']
    
    def create(self, validated_data):
        """Create review for authenticated buyer."""
        validated_data['buyer'] = self.context['request'].user
        validated_data['verified_purchase'] = True
        return super().create(validated_data)
