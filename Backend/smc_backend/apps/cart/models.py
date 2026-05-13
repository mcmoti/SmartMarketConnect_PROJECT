"""
Cart models for buyer shopping management.
"""

from django.db import models
from django.core.validators import MinValueValidator
from smc_backend.apps.users.models import User
from smc_backend.apps.products.models import Product


class Cart(models.Model):
    """
    Shopping cart for buyers.
    One active cart per buyer.
    """
    buyer = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='cart',
        limit_choices_to={'role': 'buyer'}
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cart_cart'
    
    def __str__(self):
        return f"Cart for {self.buyer.get_full_name()}"
    
    def get_total_price(self):
        """Calculate total price of all items in cart."""
        return sum(item.get_total_price() for item in self.items.all())
    
    def get_item_count(self):
        """Get total number of items in cart."""
        return self.items.aggregate(
            total=models.Sum('quantity')
        )['total'] or 0


class CartItem(models.Model):
    """
    Individual items in a cart.
    """
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='cart_items'
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cart_cartitem'
        unique_together = [('cart', 'product')]
        indexes = [
            models.Index(fields=['cart']),
            models.Index(fields=['product']),
        ]
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity} in {self.cart}"
    
    def get_total_price(self):
        """Calculate total price for this cart item."""
        return float(self.quantity) * float(self.product.price)
