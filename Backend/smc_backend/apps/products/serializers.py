"""
Serializers for products and bids.
"""

from rest_framework import serializers
from .models import Product, Bid, InventoryItem
from smc_backend.apps.users.serializers import UserListSerializer


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for product listing."""
    
    farmer_name = serializers.CharField(source='farmer.get_full_name', read_only=True)
    farmer_details = UserListSerializer(source='farmer', read_only=True)
    available_quantity = serializers.SerializerMethodField()
    bid_count = serializers.SerializerMethodField()
    crop_name = serializers.CharField(source='name', read_only=True)
    quantity_kg = serializers.DecimalField(source='quantity', max_digits=10, decimal_places=2, read_only=True)
    price_per_kg = serializers.DecimalField(source='price', max_digits=10, decimal_places=2, read_only=True)
    farmer_id = serializers.IntegerField(source='farmer.id', read_only=True)
    gps_lat = serializers.SerializerMethodField()
    gps_lng = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'farmer', 'farmer_name', 'farmer_details',
            'name', 'category', 'quantity', 'unit', 'price',
            'location', 'image', 'photo_urls', 'description',
            'expected_harvest_date', 'quality_grade', 'availability', 'status',
            'crop_name', 'quantity_kg', 'price_per_kg', 'farmer_id',
            'gps_lat', 'gps_lng',
            'available_quantity', 'bid_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'farmer', 'created_at', 'updated_at']
    
    def get_available_quantity(self, obj):
        """Get available quantity."""
        return obj.get_available_quantity()
    
    def get_bid_count(self, obj):
        """Get number of bids on product."""
        return obj.bids.filter(status='pending').count()

    def get_gps_lat(self, obj):
        return float(obj.farmer.latitude) if obj.farmer.latitude is not None else None

    def get_gps_lng(self, obj):
        return float(obj.farmer.longitude) if obj.farmer.longitude is not None else None


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating products."""

    crop_name = serializers.CharField(source='name')
    quantity_kg = serializers.DecimalField(source='quantity', max_digits=10, decimal_places=2)
    price_per_kg = serializers.DecimalField(source='price', max_digits=10, decimal_places=2)
    
    class Meta:
        model = Product
        fields = [
            'crop_name', 'category', 'quantity_kg', 'unit', 'price_per_kg',
            'location', 'image', 'photo_urls', 'description',
            'expected_harvest_date', 'quality_grade', 'availability'
        ]
    
    def create(self, validated_data):
        """Create product for authenticated farmer."""
        validated_data['farmer'] = self.context['request'].user
        return super().create(validated_data)


class BidSerializer(serializers.ModelSerializer):
    """Serializer for bids."""
    
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    price_per_kg = serializers.DecimalField(source='bid_price', max_digits=10, decimal_places=2, read_only=True)
    quantity_kg = serializers.DecimalField(source='quantity_bid', max_digits=10, decimal_places=2, read_only=True)
    listing_id = serializers.IntegerField(source='product.id', read_only=True)
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    
    class Meta:
        model = Bid
        fields = [
            'id', 'product', 'product_name', 'buyer', 'buyer_name',
            'bid_price', 'quantity_bid', 'total_bid_amount',
            'message', 'counter_price', 'status',
            'price_per_kg', 'quantity_kg', 'listing_id', 'buyer_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_bid_amount', 'created_at', 'updated_at']


class BidCreateSerializer(serializers.ModelSerializer):
    """Serializer for placing bids."""

    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), required=False)
    listing_id = serializers.PrimaryKeyRelatedField(source='product', queryset=Product.objects.all(), required=False)
    bid_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    price_per_kg = serializers.DecimalField(source='bid_price', max_digits=10, decimal_places=2, required=False)
    quantity_bid = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    quantity_kg = serializers.DecimalField(source='quantity_bid', max_digits=10, decimal_places=2, required=False)
    
    class Meta:
        model = Bid
        fields = [
            'product', 'listing_id', 'bid_price', 'price_per_kg',
            'quantity_bid', 'quantity_kg', 'message'
        ]
    
    def create(self, validated_data):
        """Create bid for authenticated buyer."""
        validated_data['buyer'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, attrs):
        if not attrs.get('product'):
            raise serializers.ValidationError('product or listing_id is required.')
        if not attrs.get('bid_price'):
            raise serializers.ValidationError('bid_price or price_per_kg is required.')
        if not attrs.get('quantity_bid'):
            raise serializers.ValidationError('quantity_bid or quantity_kg is required.')
        return attrs


class InventoryItemSerializer(serializers.ModelSerializer):
    """Serializer for internal inventory records."""

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'farmer', 'crop', 'quantity_kg',
            'expected_harvest_date', 'notes',
            'photo_urls', 'category', 'price', 'location', 'is_listed',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'farmer', 'created_at', 'updated_at']
