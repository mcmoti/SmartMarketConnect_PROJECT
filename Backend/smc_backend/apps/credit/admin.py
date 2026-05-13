"""
Admin configuration for credit.
"""

from django.contrib import admin
from .models import CreditScore, CreditRequest


@admin.register(CreditScore)
class CreditScoreAdmin(admin.ModelAdmin):
    """Admin interface for CreditScore model."""
    
    list_display = [
        'farmer', 'overall_score', 'risk_level', 'total_transactions',
        'completed_trades', 'last_calculated'
    ]
    list_filter = ['risk_level', 'last_calculated']
    search_fields = ['farmer__username', 'farmer__email']
    readonly_fields = [
        'created_at', 'updated_at', 'last_calculated',
        'cashflow_score', 'consistency_score', 'collateral_score'
    ]
    ordering = ['-overall_score']


@admin.register(CreditRequest)
class CreditRequestAdmin(admin.ModelAdmin):
    """Admin interface for CreditRequest model."""
    
    list_display = [
        'farmer', 'amount_requested', 'approval_amount', 'status',
        'is_approved', 'created_at'
    ]
    list_filter = ['status', 'is_approved', 'created_at']
    search_fields = ['farmer__username', 'purpose']
    readonly_fields = ['created_at', 'reviewed_at', 'approved_at']
    ordering = ['-created_at']
