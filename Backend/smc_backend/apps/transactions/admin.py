"""
Admin configuration for transactions.
"""

from django.contrib import admin
from .models import Transaction, Order


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """Admin interface for Transaction model."""
    
    list_display = ['id', 'user', 'amount', 'transaction_type', 'status', 'created_at']
    list_filter = ['status', 'transaction_type', 'created_at']
    search_fields = ['user__username', 'mpesa_reference']
    readonly_fields = ['created_at', 'updated_at', 'completed_at']
    ordering = ['-created_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'buyer', 'farmer', 'crop_name', 'total_price', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['buyer__username', 'farmer__username', 'product__name']
    readonly_fields = ['created_at', 'updated_at']

    @admin.display(description='Product')
    def crop_name(self, obj):
        return obj.product.name if obj.product else 'Deleted product'
