"""
Serializers for analytics and dashboard data.
"""

from rest_framework import serializers
from .models import FarmerAnalytics


class FarmerAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for farmer analytics dashboard."""
    
    farmer_name = serializers.CharField(source='farmer.get_full_name', read_only=True)
    
    class Meta:
        model = FarmerAnalytics
        fields = [
            'id', 'farmer', 'farmer_name',
            'total_sales_count', 'total_revenue', 'average_sale_value',
            'total_products_listed', 'active_products', 'sold_out_products',
            'total_bids_received', 'bids_accepted', 'acceptance_rate',
            'average_rating', 'total_reviews',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields
