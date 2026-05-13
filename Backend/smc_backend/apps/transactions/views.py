"""
Views for transactions.
"""

from decimal import Decimal

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import Transaction, Order, Invoice, Receipt
from .serializers import TransactionSerializer, OrderSerializer, CheckoutSerializer, InvoiceSerializer, ReceiptSerializer
from smc_backend.apps.products.models import Product


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing transactions.
    Users can only see their own transactions.
    """
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['transaction_type', 'status']
    ordering_fields = ['amount', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Users only see their own transactions."""
        return Transaction.objects.filter(user=self.request.user)


class OrderViewSet(viewsets.ModelViewSet):
    """Retrieve and update orders for buyers and farmers."""

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['created_at', 'total_price']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_farmer():
            return Order.objects.filter(farmer=user).select_related('buyer', 'farmer', 'product', 'transaction')
        if user.is_buyer():
            return Order.objects.filter(buyer=user).select_related('buyer', 'farmer', 'product', 'transaction')
        return Order.objects.none()

    def create(self, request, *args, **kwargs):
        return Response({'detail': 'Use the checkout action to create orders.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def perform_update(self, serializer):
        order = self.get_object()
        new_status = serializer.validated_data.get('status', order.status)
        user = self.request.user

        if user == order.farmer:
            serializer.save(status=new_status)
            return

        if user == order.buyer and new_status == 'cancelled' and order.status in ['pending', 'confirmed']:
            serializer.save(status='cancelled')
            return

        raise permissions.PermissionDenied('You do not have permission to update this order status.')

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        """Create transaction and orders from checkout form data."""
        if not request.user.is_buyer():
            raise permissions.PermissionDenied('Only buyers can checkout.')

        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items_data = serializer.validated_data['items']
        phone_number = serializer.validated_data['phone_number']
        payment_term = serializer.validated_data.get('payment_term', 'upfront')
        amount_paid = serializer.validated_data.get('amount_paid', Decimal('0'))

        order_payloads = []
        total_amount = Decimal('0')

        for item in items_data:
            product = Product.objects.filter(id=item['product_id'], status='active').select_related('farmer').first()
            if not product:
                return Response({'detail': f"Product {item['product_id']} is not available."}, status=status.HTTP_400_BAD_REQUEST)

            quantity = item['quantity']

            # ✅ Stock validation: reject if requested quantity exceeds available stock
            if quantity > product.quantity:
                return Response(
                    {'detail': f"Requested quantity ({quantity} kg) exceeds available stock ({product.quantity} kg) for {product.name}."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            total_price = quantity * product.price
            total_amount += total_price

            order_payloads.append({
                'product': product,
                'farmer': product.farmer,
                'quantity': quantity,
                'unit_price': product.price,
                'total_price': total_price,
            })

        transaction = None
        if amount_paid > 0:
            transaction = Transaction.objects.create(
                user=request.user,
                amount=amount_paid,
                transaction_type='cart_purchase',
                status='completed',
                description=f'Checkout payment ({payment_term})',
                mpesa_reference=f"MOCK-{request.user.id}-{Transaction.objects.count() + 1}",
            )

        orders = []
        for payload in order_payloads:
            # Proportionally distribute amount_paid
            if total_amount > 0:
                order_amount_paid = payload['total_price'] * (amount_paid / total_amount)
            else:
                order_amount_paid = Decimal('0')
                
            order = Order.objects.create(
                buyer=request.user,
                farmer=payload['farmer'],
                product=payload['product'],
                transaction=transaction,
                quantity=payload['quantity'],
                unit_price=payload['unit_price'],
                total_price=payload['total_price'],
                phone_number=phone_number,
                status='confirmed',
                payment_term=payment_term,
                amount_paid=order_amount_paid
            )
            orders.append(order)

            # Generate Invoice if there's a balance
            balance_due = order.total_price - order_amount_paid
            if balance_due > 0:
                Invoice.objects.create(
                    order=order,
                    buyer=request.user,
                    farmer=payload['farmer'],
                    total_amount=order.total_price,
                    amount_paid=order_amount_paid
                )

            # Generate e-receipt for the checkout transaction if any payment was made
            if order_amount_paid > 0:
                Receipt.objects.create(
                    order=order,
                    transaction=transaction,
                    amount=order_amount_paid,
                    payment_method='M-Pesa (Checkout)',
                    notes=f'Payment received via checkout ({payment_term})'
                )

        return Response(
            {
                'transaction': TransactionSerializer(transaction).data if transaction else None,
                'orders': OrderSerializer(orders, many=True).data,
            },
            status=status.HTTP_201_CREATED
        )


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Retrieve invoices for buyers and farmers."""
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['created_at', 'balance_due']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_farmer():
            return Invoice.objects.filter(farmer=user)
        if user.is_buyer():
            return Invoice.objects.filter(buyer=user)
        return Invoice.objects.none()


class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """Retrieve receipts for orders."""
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_farmer():
            return Receipt.objects.filter(order__farmer=user)
        if user.is_buyer():
            return Receipt.objects.filter(order__buyer=user)
        return Receipt.objects.none()
