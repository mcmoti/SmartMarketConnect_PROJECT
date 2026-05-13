"""
Admin configuration for cart.
"""

from django.contrib import admin
from .models import Cart, CartItem


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    """Admin interface for Cart model."""
    
    list_display = ['buyer', 'created_at', 'updated_at']
    search_fields = ['buyer__username', 'buyer__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    """Admin interface for CartItem model."""
    
    list_display = ['product', 'cart', 'quantity', 'added_at']
    search_fields = ['product__name', 'cart__buyer__username']
    readonly_fields = ['added_at', 'updated_at']
    list_filter = ['added_at']
