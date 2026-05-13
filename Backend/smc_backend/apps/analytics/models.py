"""
Analytics models for farmer dashboard and sales tracking.
"""

from django.db import models
from django.db.models import Sum, Count, Avg
from smc_backend.apps.users.models import User
from smc_backend.apps.products.models import Product
from smc_backend.apps.transactions.models import Transaction


class FarmerAnalytics(models.Model):
    """
    Aggregated analytics for farmer dashboard.
    Updated daily via Celery task.
    """
    
    farmer = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='analytics',
        limit_choices_to={'role': 'farmer'}
    )
    
    # Sales metrics
    total_sales_count = models.IntegerField(default=0)
    total_revenue = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Total revenue from completed transactions'
    )
    average_sale_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    
    # Product metrics
    total_products_listed = models.IntegerField(default=0)
    active_products = models.IntegerField(default=0)
    sold_out_products = models.IntegerField(default=0)
    
    # Engagement metrics
    total_bids_received = models.IntegerField(default=0)
    bids_accepted = models.IntegerField(default=0)
    acceptance_rate = models.FloatField(default=0)
    
    # Rating metrics
    average_rating = models.FloatField(default=0)
    total_reviews = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'analytics_farmeranalytics'
    
    def __str__(self):
        return f"Analytics for {self.farmer.get_full_name()}"
    
    def calculate_metrics(self):
        """Recalculate all analytics metrics."""
        # Sales metrics
        completed_transactions = Transaction.objects.filter(
            user=self.farmer,
            status='completed'
        )
        self.total_sales_count = completed_transactions.count()
        self.total_revenue = completed_transactions.aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        self.average_sale_value = (
            self.total_revenue / self.total_sales_count 
            if self.total_sales_count > 0 else 0
        )
        
        # Product metrics
        products = Product.objects.filter(farmer=self.farmer)
        self.total_products_listed = products.count()
        self.active_products = products.filter(status='active').count()
        self.sold_out_products = products.filter(status='sold_out').count()
        
        # Bid metrics
        from smc_backend.apps.products.models import Bid
        bids = Bid.objects.filter(product__farmer=self.farmer)
        self.total_bids_received = bids.count()
        self.bids_accepted = bids.filter(status='accepted').count()
        self.acceptance_rate = (
            (self.bids_accepted / self.total_bids_received * 100)
            if self.total_bids_received > 0 else 0
        )
        
        # Rating metrics
        from smc_backend.apps.reviews.models import Review
        reviews = Review.objects.filter(product__farmer=self.farmer)
        self.total_reviews = reviews.count()
        self.average_rating = (
            reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        )
        
        self.save()
