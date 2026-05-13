"""
Transaction models for tracking all payments and orders.
"""

from django.db import models
from django.core.validators import MinValueValidator
from smc_backend.apps.users.models import User


class Transaction(models.Model):
    """
    Track all transactions on the platform.
    """
    
    TRANSACTION_TYPE_CHOICES = [
        ('cart_purchase', 'Cart Purchase'),
        ('bid_acceptance', 'Bid Acceptance'),
        ('credit_disbursement', 'Credit Disbursement'),
        ('credit_repayment', 'Credit Repayment'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    transaction_type = models.CharField(
        max_length=50,
        choices=TRANSACTION_TYPE_CHOICES
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Reference to related objects
    cart = models.ForeignKey(
        'cart.Cart',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    bid = models.ForeignKey(
        'products.Bid',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    credit_request = models.ForeignKey(
        'credit.CreditRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    
    # M-Pesa reference
    mpesa_reference = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='M-Pesa transaction reference'
    )
    
    description = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'transactions_transaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Transaction {self.id} - {self.user.username} - {self.amount} ({self.status})"


class Order(models.Model):
    """Track purchase orders created during checkout."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='orders_made',
        limit_choices_to={'role': 'buyer'}
    )
    farmer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='orders_received',
        limit_choices_to={'role': 'farmer'}
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    total_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    
    # New flexible payment fields
    PAYMENT_TERM_CHOICES = [
        ('upfront', 'Upfront (100%)'),
        ('deposit', 'Deposit / Partial Payment'),
        ('on_delivery', 'Pay on Delivery (0%)'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('partial', 'Partial Payment'),
        ('completed', 'Completed'),
    ]
    payment_term = models.CharField(max_length=20, choices=PAYMENT_TERM_CHOICES, default='upfront')
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')

    phone_number = models.CharField(max_length=20, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transactions_order'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['buyer', 'status']),
            models.Index(fields=['farmer', 'status']),
            models.Index(fields=['created_at']),
        ]

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        
        if self.amount_paid >= self.total_price:
            self.payment_status = 'completed'
        elif self.amount_paid > 0:
            self.payment_status = 'partial'
        else:
            self.payment_status = 'pending'
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.id} - {self.buyer.username} -> {self.farmer.username}"


class Invoice(models.Model):
    """Tracks debts (balance due) from a buyer to a farmer for an order."""
    STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partial', 'Partially Paid'),
        ('paid', 'Paid in Full'),
    ]
    
    invoice_number = models.CharField(max_length=100, unique=True, blank=True)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices_to_pay')
    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices_issued')
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unpaid')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'transactions_invoice'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Generate sequential invoice number (A1, A2, etc)
            last_invoice = Invoice.objects.order_by('-id').first()
            if last_invoice and last_invoice.invoice_number and last_invoice.invoice_number.startswith('A'):
                try:
                    num = int(last_invoice.invoice_number[1:])
                    self.invoice_number = f"A{num + 1}"
                except ValueError:
                    self.invoice_number = f"A{Invoice.objects.count() + 1}"
            else:
                self.invoice_number = f"A{Invoice.objects.count() + 1}"

        self.balance_due = self.total_amount - self.amount_paid
        if self.balance_due <= 0:
            self.status = 'paid'
        elif self.amount_paid > 0:
            self.status = 'partial'
        else:
            self.status = 'unpaid'
        super().save(*args, **kwargs)


class Receipt(models.Model):
    """Proof of transaction / goods sold between buyer and farmer."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='receipts')
    transaction = models.ForeignKey(Transaction, on_delete=models.SET_NULL, null=True, related_name='receipts')
    
    receipt_number = models.CharField(max_length=100, unique=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50, default='M-Pesa')
    notes = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'transactions_receipt'
        ordering = ['-created_at']
        
    def save(self, *args, **kwargs):
        if not self.receipt_number:
            import uuid
            self.receipt_number = f"RCT-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

