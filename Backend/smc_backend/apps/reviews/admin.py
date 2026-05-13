"""
Admin configuration for reviews.
"""

from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Admin interface for Review model."""
    
    list_display = ['buyer', 'product', 'rating', 'verified_purchase', 'created_at']
    list_filter = ['rating', 'verified_purchase', 'created_at']
    search_fields = ['buyer__username', 'product__name', 'comment']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
