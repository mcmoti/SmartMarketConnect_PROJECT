"""
Admin configuration for market.
"""

from django.contrib import admin
from .models import MarketPrice


@admin.register(MarketPrice)
class MarketPriceAdmin(admin.ModelAdmin):
    """Admin interface for MarketPrice model."""
    
    list_display = ['crop_name', 'unit_price', 'unit', 'price_trend', 'updated_at']
    list_filter = ['category', 'price_trend', 'updated_at']
    search_fields = ['crop_name', 'category']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-updated_at']
