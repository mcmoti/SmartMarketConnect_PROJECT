"""
Admin configuration for geolocation.
"""

from django.contrib import admin
from .models import BuyerPreference, BuyerFarmerMatch


@admin.register(BuyerPreference)
class BuyerPreferenceAdmin(admin.ModelAdmin):
    """Admin interface for BuyerPreference model."""
    
    list_display = ['buyer', 'search_radius_km', 'min_rating', 'notify_on_match', 'updated_at']
    search_fields = ['buyer__username', 'buyer__email']
    list_filter = ['notify_on_match', 'created_at']


@admin.register(BuyerFarmerMatch)
class BuyerFarmerMatchAdmin(admin.ModelAdmin):
    """Admin interface for BuyerFarmerMatch model."""
    
    list_display = ['buyer', 'farmer', 'distance_km', 'match_score', 'is_active']
    list_filter = ['is_active', 'created_at']
    search_fields = ['buyer__username', 'farmer__username']
    ordering = ['-match_score']
