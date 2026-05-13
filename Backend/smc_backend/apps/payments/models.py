"""
Payment models for M-Pesa integration tracking.
"""

from django.db import models
from smc_backend.apps.users.models import User


class MpesaTransaction(models.Model):
    """
    Track all M-Pesa STK Push transactions.
    """

    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='mpesa_transactions'
    )

    # M-Pesa identifiers
    checkout_request_id = models.CharField(
        max_length=255,
        unique=True,
        blank=True,
        default=''
    )
    merchant_request_id = models.CharField(
        max_length=255,
        blank=True,
        default=''
    )
    mpesa_receipt_number = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='M-Pesa receipt number after successful payment'
    )

    # Payment details
    phone_number = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    account_reference = models.CharField(max_length=255, blank=True, default='SMC')
    description = models.CharField(max_length=255, blank=True, default='')

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    result_code = models.IntegerField(null=True, blank=True)
    result_description = models.TextField(blank=True, default='')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payments_mpesatransaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['checkout_request_id']),
            models.Index(fields=['mpesa_receipt_number']),
        ]
 
    def __str__(self):
        return f"MPesa {self.id} | {self.phone_number} | KES {self.amount} | {self.status}"
