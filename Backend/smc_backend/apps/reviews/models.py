"""
Review and rating models for product quality feedback.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from smc_backend.apps.users.models import User
from smc_backend.apps.products.models import Product
from smc_backend.apps.transactions.models import Transaction


class Review(models.Model):
    """
    Product reviews from buyers after purchase.
    Ensures only buyers who purchased can review.
    """
    
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews_written',
        limit_choices_to={'role': 'buyer'}
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.CASCADE,
        related_name='review',
        help_text='Transaction proof of purchase'
    )
    
    # Rating
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Rating from 1 to 5 stars'
    )
    
    # Comment
    comment = models.TextField(
        blank=True,
        default='',
        help_text='Detailed feedback on product quality'
    )
    
    # Metadata
    verified_purchase = models.BooleanField(
        default=True,
        help_text='Verified that buyer purchased this product'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reviews_review'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'buyer']),
            models.Index(fields=['rating']),
            models.Index(fields=['created_at']),
        ]
        unique_together = [['product', 'transaction']]  # One review per product per transaction
    
    def __str__(self):
        return f"Review by {self.buyer.username} on {self.product.name} - {self.rating}★"
