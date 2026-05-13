"""
Admin configuration for analytics.
"""

from django.contrib import admin
from .models import FarmerAnalytics


@admin.register(FarmerAnalytics)
class FarmerAnalyticsAdmin(admin.ModelAdmin):
    """Admin interface for FarmerAnalytics model."""
    
    list_display = [
        'farmer', 'total_sales_count', 'total_revenue', 'average_rating',
        'active_products', 'updated_at'
    ]
    search_fields = ['farmer__username', 'farmer__email']
    readonly_fields = [
        'created_at', 'updated_at', 'total_sales_count', 'total_revenue',
        'average_sale_value', 'total_products_listed', 'active_products',
        'sold_out_products', 'total_bids_received', 'bids_accepted',
        'acceptance_rate', 'average_rating', 'total_reviews'
    ]
    list_filter = ['created_at', 'updated_at']
