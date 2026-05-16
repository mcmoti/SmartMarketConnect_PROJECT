"""
Views for products and bids.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404

from .models import Product, Bid, InventoryItem
from .serializers import (
    ProductSerializer,
    ProductCreateUpdateSerializer,
    BidSerializer,
    BidCreateSerializer,
    InventoryItemSerializer,
)


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing products.
    
    Farmers can create, update, delete their products.
    Buyers can view and filter products.
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'category', 'unit', 'availability', 'farmer']
    search_fields = ['name', 'category', 'location', 'description']
    ordering_fields = ['price', 'created_at', 'quantity']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get products based on user role."""
        if self.request.user.is_farmer():
            # Farmers see their own products
            return Product.objects.filter(farmer=self.request.user)
        # Buyers and others see only active products
        return Product.objects.filter(status='active')
    
    def get_serializer_class(self):
        """Use different serializer for create/update."""
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductSerializer
    
    def perform_create(self, serializer):
        """Create product for authenticated farmer."""
        if not self.request.user.is_farmer():
            raise permissions.PermissionDenied(
                'Only farmers can create products.'
            )
        product = serializer.save(farmer=self.request.user)
        
        # Sync the new listing directly to the internal Inventory
        from .models import InventoryItem
        InventoryItem.objects.get_or_create(
            farmer=self.request.user,
            crop=product.name,
            defaults={
                'category': product.category,
                'quantity_kg': product.quantity,
                'price': product.price,
                'location': product.location,
                'photo_urls': product.photo_urls,
                'notes': product.description,
                'is_listed': True
            }
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        output_serializer = ProductSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        output_serializer = ProductSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(output_serializer.data)
    
    def perform_update(self, serializer):
        """Update product (farmer only)."""
        product = self.get_object()
        if product.farmer != self.request.user:
            raise permissions.PermissionDenied(
                'You can only update your own products.'
            )
        serializer.save()
    
    def perform_destroy(self, instance):
        """Delete product (farmer only)."""
        if instance.farmer != self.request.user:
            raise permissions.PermissionDenied(
                'You can only delete your own products.'
            )
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def mark_sold_out(self, request, pk=None):
        """Mark product as sold out."""
        product = self.get_object()
        if product.farmer != request.user:
            raise permissions.PermissionDenied()
        
        product.status = 'sold_out'
        product.save()
        return Response(
            {'message': 'Product marked as sold out'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def bids(self, request, pk=None):
        """Get all bids for a product."""
        product = self.get_object()
        
        # Only product owner can see bids
        if product.farmer != request.user:
            raise permissions.PermissionDenied(
                'You can only view bids on your own products.'
            )
        
        bids = product.bids.all()
        serializer = BidSerializer(bids, many=True)
        return Response(serializer.data)


class BidViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing bids.
    
    Buyers can place bids on products.
    Farmers can accept/reject bids on their products.
    """
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['product', 'status']
    ordering_fields = ['bid_price', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get bids based on user role."""
        user = self.request.user
        if user.is_farmer():
            # Farmers see bids on their products
            return Bid.objects.filter(product__farmer=user)
        else:
            # Buyers see their own bids
            return Bid.objects.filter(buyer=user)
    
    def get_serializer_class(self):
        """Use different serializer for create."""
        if self.action == 'create':
            return BidCreateSerializer
        return BidSerializer
    
    def perform_create(self, serializer):
        """Create bid for authenticated buyer."""
        if not self.request.user.is_buyer():
            raise permissions.PermissionDenied(
                'Only buyers can place bids.'
            )
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        output_serializer = BidSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def counter(self, request, pk=None):
        """Counter a bid with a revised price (farmer only)."""
        bid = self.get_object()

        if bid.product.farmer != request.user:
            raise permissions.PermissionDenied('Only the farmer can counter this bid.')

        counter_price = request.data.get('counter_price')
        if not counter_price:
            return Response({'counter_price': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        bid.counter_price = counter_price
        bid.status = 'countered'
        bid.save()

        return Response(BidSerializer(bid).data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a bid (farmer only)."""
        bid = self.get_object()
        
        # Only farmer can accept bids
        if bid.product.farmer != request.user:
            raise permissions.PermissionDenied(
                'Only the farmer can accept bids.'
            )
        
        if bid.status != 'pending':
            return Response(
                {'error': 'Only pending bids can be accepted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bid.status = 'accepted'
        bid.save()
        
        # Create transaction for accepted bid
        from smc_backend.apps.transactions.models import Transaction
        Transaction.objects.create(
            user=bid.buyer,
            amount=bid.total_bid_amount,
            transaction_type='bid_acceptance',
            status='pending'
        )
        
        return Response(BidSerializer(bid).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def accept_counter(self, request, pk=None):
        """Accept a counter offer or checkout an accepted bid (buyer only)."""
        bid = self.get_object()
        
        if bid.buyer != request.user:
            raise permissions.PermissionDenied('Only the buyer can accept a counter offer.')
            
        if bid.status not in ['countered', 'accepted']:
            return Response({'error': 'Only countered or accepted bids can be checked out'}, status=status.HTTP_400_BAD_REQUEST)
            
        bid.status = 'checked_out'
        bid.save()
        
        from smc_backend.apps.transactions.models import Transaction, Order, Invoice, Receipt
        from decimal import Decimal
        
        agreed_price = bid.counter_price if bid.counter_price else bid.bid_price
        
        try:
            total_amount = Decimal(str(agreed_price)) * Decimal(str(bid.quantity_bid))
        except:
            total_amount = agreed_price * bid.quantity_bid
            
        payment_term = request.data.get('payment_term', 'upfront')
        amount_paid = Decimal(str(request.data.get('amount_paid', total_amount)))
        
        # Security fallbacks
        if payment_term == 'on_delivery':
            amount_paid = Decimal('0.00')
        elif payment_term == 'upfront':
            amount_paid = total_amount
        
        transaction = None
        if amount_paid > 0:
            transaction = Transaction.objects.create(
                user=bid.buyer,
                amount=amount_paid,
                transaction_type='bid_acceptance',
                status='completed',
                description=f'Payment for bid checkout ({payment_term})'
            )
        
        phone_number = request.data.get('phone_number', '')
        if not phone_number:
            phone_number = getattr(bid.buyer, 'phone_number', '+254000000000')

        order = Order.objects.create(
            buyer=bid.buyer,
            farmer=bid.product.farmer,
            product=bid.product,
            transaction=transaction,
            quantity=bid.quantity_bid,
            unit_price=agreed_price,
            total_price=total_amount,
            phone_number=phone_number,
            status='confirmed',
            payment_term=payment_term,
            amount_paid=amount_paid
        )
        
        # Generate Invoice for the balance due tracking
        Invoice.objects.create(
            order=order,
            buyer=bid.buyer,
            farmer=bid.product.farmer,
            total_amount=total_amount,
            amount_paid=amount_paid
        )
        
        # Generate Receipt if a payment was made
        if transaction and amount_paid > 0:
            Receipt.objects.create(
                order=order,
                transaction=transaction,
                amount=amount_paid,
                notes=f'Payment via {payment_term}'
            )
        
        return Response(BidSerializer(bid).data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a bid (farmer only)."""
        bid = self.get_object()
        
        # Only farmer can reject bids
        if bid.product.farmer != request.user:
            raise permissions.PermissionDenied(
                'Only the farmer can reject bids.'
            )
        
        if bid.status != 'pending':
            return Response(
                {'error': 'Only pending bids can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bid.status = 'rejected'
        bid.save()
        
        return Response(BidSerializer(bid).data, status=status.HTTP_200_OK)


class InventoryItemViewSet(viewsets.ModelViewSet):
    """ViewSet for internal farmer inventory records."""

    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['expected_harvest_date']
    ordering_fields = ['created_at', 'quantity_kg', 'expected_harvest_date']
    ordering = ['-created_at']

    def get_queryset(self):
        if not self.request.user.is_farmer():
            return InventoryItem.objects.none()
        return InventoryItem.objects.filter(farmer=self.request.user)

    def perform_create(self, serializer):
        if not self.request.user.is_farmer():
            raise permissions.PermissionDenied('Only farmers can manage inventory.')
        instance = serializer.save(farmer=self.request.user)
        self._sync_to_marketplace(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._sync_to_marketplace(instance)

    def _sync_to_marketplace(self, instance):
        """Internal helper to create or update a Product listing from an InventoryItem."""
        if not instance.is_listed:
            # If it was previously listed but now unchecked, we might want to archive it
            # For now, let's just return
            return

        # Create or update corresponding Product
        # We'll use a simple matching logic (e.g., matching by name and farmer if we want to sync)
        # Or better, add an 'inventory_item' FK to Product. 
        # But let's keep it simple: create/update based on InventoryItem model.
        
        # Check if a product with same name and farmer exists
        product, created = Product.objects.get_or_create(
            farmer=instance.farmer,
            name=instance.crop,
            defaults={
                'category': instance.category,
                'quantity': instance.quantity_kg,
                'price': instance.price if instance.price else 100.0, # fallback price
                'location': instance.location if instance.location else instance.farmer.location,
                'photo_urls': instance.photo_urls,
                'description': instance.notes,
                'status': 'active'
            }
        )

        if not created:
            # Update existing product
            product.category = instance.category
            product.quantity = instance.quantity_kg
            if instance.price:
                product.price = instance.price
            if instance.location:
                product.location = instance.location
            product.photo_urls = instance.photo_urls
            product.description = instance.notes
            product.status = 'active'
            product.save()
