"""
Product models for farmers' produce listings and bidding system.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from smc_backend.apps.users.models import User


class Product(models.Model):
    """
    Product listing created by farmers.
    
    Fields:
    - farmer: FK to User (farmer role)
    - name: Product name (e.g., tomatoes, maize)
    - quantity: Amount available
    - unit: Unit of measurement (kg, bags, etc.)
    - price: Price per unit
    - location: Where the product is located
    - image: Product image
    - description: Detailed description
    - status: active, sold_out, archived
    - created_at, updated_at: Timestamps
    """
    
    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('bag', 'Bag'),
        ('bunch', 'Bunch'),
        ('crate', 'Crate'),
        ('unit', 'Unit'),
        ('liter', 'Liter'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('sold_out', 'Sold Out'),
        ('archived', 'Archived'),
    ]

    AVAILABILITY_CHOICES = [
        ('available', 'Available Now'),
        ('pre_harvest', 'Pre-Harvest'),
        ('limited', 'Limited Stock'),
    ]

    QUALITY_GRADE_CHOICES = [
        ('A', 'Grade A'),
        ('B', 'Grade B'),
        ('C', 'Grade C'),
    ]
    
    farmer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='products',
        limit_choices_to={'role': 'farmer'}
    )
    
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, default='general')
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='kg')
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text='Price per unit'
    )
    location = models.CharField(max_length=255)
    image = models.ImageField(upload_to='product_images/', null=True, blank=True)
    photo_urls = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True, default='')
    expected_harvest_date = models.DateField(null=True, blank=True)
    quality_grade = models.CharField(
        max_length=1,
        choices=QUALITY_GRADE_CHOICES,
        default='A'
    )
    availability = models.CharField(
        max_length=20,
        choices=AVAILABILITY_CHOICES,
        default='available'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products_product'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['farmer', 'status']),
            models.Index(fields=['category']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.quantity}{self.unit} by {self.farmer.get_full_name()}"
    
    def get_available_quantity(self):
        """Get quantity still available after bids and cart items."""
        from smc_backend.apps.cart.models import CartItem
        
        cart_qty = CartItem.objects.filter(product=self).aggregate(
            total=models.Sum('quantity')
        )['total'] or 0
        
        # Could also subtract pending bids
        return float(self.quantity) - float(cart_qty)


class Bid(models.Model):
    """
    Bidding system for buyers to offer prices.
    
    Farmers can accept or reject bids.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('countered', 'Countered'),
        ('checked_out', 'Checked Out'),
    ]
    
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='bids'
    )
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bids_placed',
        limit_choices_to={'role': 'buyer'}
    )
    
    bid_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text='Offered price per unit'
    )
    quantity_bid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    total_bid_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text='Total bid amount (quantity * price)'
    )
    
    message = models.TextField(blank=True, default='')
    counter_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.01)]
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products_bid'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'status']),
            models.Index(fields=['buyer']),
        ]
        unique_together = [('product', 'buyer')]  # One bid per buyer per product
    
    def __str__(self):
        return f"Bid on {self.product.name} by {self.buyer.get_full_name()} - {self.status}"
    
    def save(self, *args, **kwargs):
        """Calculate total bid amount before saving."""
        self.total_bid_amount = float(self.bid_price) * float(self.quantity_bid)
        super().save(*args, **kwargs)


class InventoryItem(models.Model):
    """Internal farmer inventory records captured from dashboard forms."""

    farmer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='inventory_items',
        limit_choices_to={'role': 'farmer'}
    )
    crop = models.CharField(max_length=255)
    quantity_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    expected_harvest_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    photo_urls = models.JSONField(default=list, blank=True)
    category = models.CharField(max_length=100, default='general')
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.01)],
        help_text='Price per unit if listed in marketplace'
    )
    location = models.CharField(max_length=255, blank=True, default='')
    is_listed = models.BooleanField(default=False, help_text='Whether to show this in the marketplace')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products_inventoryitem'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['farmer', 'created_at']),
        ]

    def __str__(self):
        return f"{self.crop} ({self.quantity_kg}kg)"




