"""
Views for cart management.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Cart, CartItem
from smc_backend.apps.products.models import Product
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    CartItemAddSerializer,
    CartItemUpdateSerializer
)


class CartViewSet(viewsets.ViewSet):
    """
    ViewSet for cart management.
    Buyers can view and manage their cart.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """Get current user's cart."""
        cart, created = Cart.objects.get_or_create(buyer=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """Get cart details."""
        cart = get_object_or_404(Cart, buyer=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add item to cart."""
        serializer = CartItemAddSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        product = get_object_or_404(Product, id=serializer.validated_data['product_id'])
        quantity = serializer.validated_data['quantity']
        
        # Check availability
        if float(quantity) > product.get_available_quantity():
            return Response(
                {'error': f'Only {product.get_available_quantity()} units available'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create cart
        cart, created = Cart.objects.get_or_create(buyer=request.user)
        
        # Add or update item
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )
        
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        serializer = CartItemSerializer(cart_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        """Remove item from cart."""
        product_id = request.data.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'product_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cart = get_object_or_404(Cart, buyer=request.user)
        cart_item = get_object_or_404(CartItem, cart=cart, product_id=product_id)
        
        cart_item.delete()
        return Response(
            {'message': 'Item removed from cart'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'])
    def clear(self, request):
        """Clear all items from cart."""
        cart = get_object_or_404(Cart, buyer=request.user)
        cart.items.all().delete()
        
        return Response(
            {'message': 'Cart cleared'},
            status=status.HTTP_200_OK
        )


class CartItemViewSet(viewsets.ViewSet):
    """
    ViewSet for managing individual cart items.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """Get all items in user's cart."""
        cart = get_object_or_404(Cart, buyer=request.user)
        items = cart.items.all()
        serializer = CartItemSerializer(items, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """Get a specific cart item."""
        cart = get_object_or_404(Cart, buyer=request.user)
        item = get_object_or_404(CartItem, cart=cart, product_id=pk)
        serializer = CartItemSerializer(item)
        return Response(serializer.data)
    
    def update(self, request, pk=None):
        """Update cart item quantity."""
        serializer = CartItemUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        cart = get_object_or_404(Cart, buyer=request.user)
        item = get_object_or_404(CartItem, cart=cart, product_id=pk)
        
        quantity = serializer.validated_data['quantity']
        
        # Check availability
        if float(quantity) > item.product.get_available_quantity() + float(item.quantity):
            return Response(
                {'error': 'Insufficient quantity available'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        item.quantity = quantity
        item.save()
        
        serializer = CartItemSerializer(item)
        return Response(serializer.data)
    
    def partial_update(self, request, pk=None):
        """Partial update for cart item."""
        return self.update(request, pk)
