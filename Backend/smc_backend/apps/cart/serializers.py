"""
Serializers for cart management.
"""

from rest_framework import serializers
from .models import Cart, CartItem
from smc_backend.apps.products.serializers import ProductSerializer


class CartItemSerializer(serializers.ModelSerializer):
    """Serializer for cart items."""
    
    product_details = ProductSerializer(source='product', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(
        source='product.price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_name', 'product_price',
            'product_details', 'quantity', 'total_price',
            'added_at', 'updated_at'
        ]
        read_only_fields = ['id', 'added_at', 'updated_at']
    
    def get_total_price(self, obj):
        """Calculate total price for this item."""
        return obj.get_total_price()


class CartSerializer(serializers.ModelSerializer):
    """Serializer for cart with items."""
    
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Cart
        fields = [
            'id', 'buyer', 'items', 'item_count', 'total_price',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'buyer', 'created_at', 'updated_at']
    
    def get_total_price(self, obj):
        """Calculate total price."""
        return obj.get_total_price()
    
    def get_item_count(self, obj):
        """Get item count."""
        return obj.get_item_count()


class CartItemAddSerializer(serializers.Serializer):
    """Serializer for adding item to cart."""
    
    product_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    
    def validate_product_id(self, value):
        """Validate product exists."""
        from smc_backend.apps.products.models import Product
        try:
            Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError('Product not found.')
        return value


class CartItemUpdateSerializer(serializers.Serializer):
    """Serializer for updating cart item quantity."""
    
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
