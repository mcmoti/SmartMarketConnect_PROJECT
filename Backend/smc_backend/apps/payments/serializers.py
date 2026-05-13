"""
Serializers for payment models.
"""

from rest_framework import serializers
from .models import MpesaTransaction


class MpesaSTKPushSerializer(serializers.Serializer):
    """Serializer for validating STK Push request input."""
    phone_number = serializers.CharField(max_length=20)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0)
    account_reference = serializers.CharField(max_length=255, default='SMC', required=False)
    description = serializers.CharField(max_length=255, default='SMC Payment', required=False)

    def validate_phone_number(self, value):
        """Normalize Kenyan phone number to 254XXXXXXXXX format."""
        value = value.strip().replace('+', '').replace(' ', '')
        if value.startswith('0'):
            value = '254' + value[1:]
        if not value.startswith('254') or len(value) != 12:
            raise serializers.ValidationError(
                'Phone must be a valid Kenyan number e.g. 254712345678'
            )
        return value


class MpesaTransactionSerializer(serializers.ModelSerializer):
    """Serializer for MpesaTransaction model."""

    class Meta:
        model = MpesaTransaction
        fields = [
            'id', 'checkout_request_id', 'mpesa_receipt_number',
            'phone_number', 'amount', 'account_reference',
            'description', 'status', 'result_description',
            'created_at', 'completed_at',
        ]
        read_only_fields = fields
