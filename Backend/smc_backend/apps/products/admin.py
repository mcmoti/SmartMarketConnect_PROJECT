"""
Admin configuration for products.
"""

from django.contrib import admin
from .models import Product, Bid, InventoryItem


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin interface for Product model."""
    
    list_display = ['name', 'farmer', 'quantity', 'unit', 'price', 'availability', 'status', 'created_at']
    list_filter = ['status', 'availability', 'category', 'unit', 'created_at']
    search_fields = ['name', 'farmer__username', 'location']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {'fields': ('farmer', 'name', 'category', 'description')}),
        ('Details', {'fields': ('quantity', 'unit', 'price', 'location', 'expected_harvest_date', 'quality_grade', 'availability')}),
        ('Media', {'fields': ('image', 'photo_urls')}),
        ('Status', {'fields': ('status',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    """Admin interface for Bid model."""
    
    list_display = ['product', 'buyer', 'bid_price', 'quantity_bid', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['product__name', 'buyer__username']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'total_bid_amount']


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ['crop', 'farmer', 'quantity_kg', 'expected_harvest_date', 'created_at']
    list_filter = ['expected_harvest_date', 'created_at']
    search_fields = ['crop', 'farmer__username', 'farmer__email']
