"""
Views for analytics and dashboard endpoints.
"""

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import timedelta

from .models import FarmerAnalytics
from .serializers import FarmerAnalyticsSerializer
from smc_backend.apps.transactions.models import Transaction
from smc_backend.apps.products.models import Product, Bid


class AnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for farmer analytics and dashboard.
    Farmers can view their own analytics.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FarmerAnalyticsSerializer
    
    def get_queryset(self):
        """Get analytics for current farmer."""
        user = self.request.user
        if user.is_farmer():
            return FarmerAnalytics.objects.filter(farmer=user)
        return FarmerAnalytics.objects.none()
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get comprehensive dashboard data for farmer."""
        if not request.user.is_farmer():
            raise permissions.PermissionDenied('Only farmers can view analytics.')
        
        # Get or create analytics
        analytics, _ = FarmerAnalytics.objects.get_or_create(farmer=request.user)
        analytics.calculate_metrics()
        
        # Get time-series data
        now = timezone.now()
        last_30_days = now - timedelta(days=30)
        
        # Revenue last 30 days
        revenue_30d = Transaction.objects.filter(
            user=request.user,
            status='completed',
            created_at__gte=last_30_days
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Daily revenue breakdown
        daily_revenue = Transaction.objects.filter(
            user=request.user,
            status='completed',
            created_at__gte=last_30_days
        ).extra(
            select={'date': 'DATE(created_at)'}
        ).values('date').annotate(revenue=Sum('amount')).order_by('date')
        
        # Top products
        top_products = Product.objects.filter(
            farmer=request.user
        ).annotate(
            sales_count=Count('bids', filter=Q(bids__status='accepted'))
        ).order_by('-sales_count')[:5]
        
        from smc_backend.apps.products.serializers import ProductSerializer
        top_products_data = ProductSerializer(top_products, many=True).data
        
        dashboard_data = {
            'analytics': FarmerAnalyticsSerializer(analytics).data,
            'revenue_30d': float(revenue_30d),
            'daily_revenue': [
                {
                    'date': item['date'].isoformat(),
                    'revenue': float(item['revenue'])
                }
                for item in daily_revenue
            ],
            'top_products': top_products_data,
        }
        
        return Response(dashboard_data)
    
    @action(detail=False, methods=['get'])
    def revenue_trend(self, request):
        """Get revenue trend over time."""
        if not request.user.is_farmer():
            raise permissions.PermissionDenied()
        
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        revenue_data = Transaction.objects.filter(
            user=request.user,
            status='completed',
            created_at__gte=start_date
        ).extra(
            select={'date': 'DATE(created_at)'}
        ).values('date').annotate(
            revenue=Sum('amount'),
            count=Count('id')
        ).order_by('date')
        
        return Response([
            {
                'date': item['date'].isoformat(),
                'revenue': float(item['revenue']),
                'transactions': item['count']
            }
            for item in revenue_data
        ])
    
    @action(detail=False, methods=['get'])
    def product_performance(self, request):
        """Get performance metrics for each product."""
        if not request.user.is_farmer():
            raise permissions.PermissionDenied()
        
        products = Product.objects.filter(farmer=request.user).annotate(
            bids_count=Count('bids'),
            accepted_bids=Count('bids', filter=Q(bids__status='accepted')),
            reviews_count=Count('reviews'),
            avg_rating=Avg('reviews__rating'),
            total_revenue=Sum(
                'bids__total_bid_amount',
                filter=Q(bids__status='accepted')
            )
        )
        
        return Response([
            {
                'product_id': p.id,
                'name': p.name,
                'total_bids': p.bids_count,
                'accepted_bids': p.accepted_bids,
                'review_count': p.reviews_count,
                'avg_rating': float(p.avg_rating) if p.avg_rating else 0,
                'revenue': float(p.total_revenue) if p.total_revenue else 0,
                'status': p.status
            }
            for p in products
        ])
