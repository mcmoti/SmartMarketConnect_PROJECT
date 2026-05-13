"""
Serializers for transactions.
"""

from rest_framework import serializers
from .models import Transaction, Order


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for transactions."""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'user', 'user_name', 'amount', 'transaction_type',
            'status', 'mpesa_reference', 'description',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'completed_at']


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for buyer/farmer orders."""

    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    farmer_name = serializers.CharField(source='farmer.get_full_name', read_only=True)
    crop_name = serializers.CharField(source='product.name', read_only=True, allow_null=True)
    listing_id = serializers.IntegerField(source='product.id', read_only=True, allow_null=True)
    quantity_kg = serializers.DecimalField(source='quantity', max_digits=10, decimal_places=2, read_only=True)
    amount = serializers.DecimalField(source='total_price', max_digits=12, decimal_places=2, read_only=True)
    date = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'buyer', 'buyer_name', 'farmer', 'farmer_name',
            'product', 'listing_id', 'crop_name',
            'quantity', 'quantity_kg', 'unit_price', 'total_price', 'amount',
            'phone_number', 'status', 'notes', 'transaction',
            'payment_term', 'amount_paid', 'payment_status',
            'created_at', 'date', 'updated_at'
        ]
        read_only_fields = [
            'id', 'buyer', 'farmer', 'product', 'unit_price', 'total_price',
            'transaction', 'created_at', 'updated_at'
        ]


class CheckoutItemSerializer(serializers.Serializer):
    """Serializer for each checkout line item."""

    product_id = serializers.IntegerField(required=False)
    listing_id = serializers.IntegerField(required=False)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    quantity_kg = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate(self, attrs):
        attrs['product_id'] = attrs.get('product_id') or attrs.get('listing_id')
        attrs['quantity'] = attrs.get('quantity') or attrs.get('quantity_kg')

        if not attrs['product_id']:
            raise serializers.ValidationError('product_id or listing_id is required.')
        if not attrs['quantity']:
            raise serializers.ValidationError('quantity or quantity_kg is required.')
        return attrs


class CheckoutSerializer(serializers.Serializer):
    """Serializer for checkout payload."""

    phone_number = serializers.CharField()
    items = CheckoutItemSerializer(many=True)
    payment_term = serializers.ChoiceField(choices=['upfront', 'deposit', 'on_delivery'], default='upfront')
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for tracking debts."""
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    farmer_name = serializers.CharField(source='farmer.get_full_name', read_only=True)
    crop_name = serializers.SerializerMethodField()

    class Meta:
        from .models import Invoice
        model = Invoice
        fields = [
            'id', 'order', 'invoice_number', 'buyer', 'buyer_name', 'farmer', 'farmer_name', 'crop_name',
            'total_amount', 'amount_paid', 'balance_due', 'due_date', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'buyer', 'farmer', 'total_amount', 'balance_due', 'created_at', 'updated_at']

    def get_crop_name(self, obj):
        return obj.order.product.name if obj.order and obj.order.product else "Assorted Items"


class ReceiptSerializer(serializers.ModelSerializer):
    """Serializer for receipts."""
    buyer_name = serializers.CharField(source='order.buyer.get_full_name', read_only=True)
    farmer_name = serializers.CharField(source='order.farmer.get_full_name', read_only=True)
    crop_name = serializers.SerializerMethodField()
    quantity = serializers.DecimalField(source='order.quantity', max_digits=10, decimal_places=2, read_only=True)
    unit_price = serializers.DecimalField(source='order.unit_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        from .models import Receipt
        model = Receipt
        fields = [
            'id', 'order', 'transaction', 'receipt_number', 'amount', 'payment_method', 'notes', 'created_at',
            'buyer_name', 'farmer_name', 'crop_name', 'quantity', 'unit_price'
        ]
        read_only_fields = ['id', 'receipt_number', 'created_at']

    def get_crop_name(self, obj):
        return obj.order.product.name if obj.order and obj.order.product else "Assorted Items"
