"""
Views for reviews and ratings.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import Review
from .serializers import ReviewSerializer, ReviewCreateSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing product reviews.
    
    Buyers can create reviews for products they purchased.
    All users can view reviews.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['product', 'rating']
    ordering_fields = ['rating', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get reviews based on context."""
        # All authenticated users can view all reviews
        return Review.objects.all()
    
    def get_serializer_class(self):
        """Use different serializer for create."""
        if self.action == 'create':
            return ReviewCreateSerializer
        return ReviewSerializer
    
    def perform_create(self, serializer):
        """Create review for authenticated buyer."""
        if not self.request.user.is_buyer():
            raise permissions.PermissionDenied(
                'Only buyers can create reviews.'
            )
        
        # Validate that buyer has a transaction for this product
        product = serializer.validated_data['product']
        transaction = serializer.validated_data['transaction']
        
        if transaction.user != self.request.user:
            raise permissions.PermissionDenied(
                'Transaction must belong to you.'
            )
        
        serializer.save()
    
    def perform_update(self, serializer):
        """Update review (only by author)."""
        review = self.get_object()
        if review.buyer != self.request.user:
            raise permissions.PermissionDenied(
                'You can only update your own reviews.'
            )
        serializer.save()
    
    def perform_destroy(self, instance):
        """Delete review (only by author)."""
        if instance.buyer != self.request.user:
            raise permissions.PermissionDenied(
                'You can only delete your own reviews.'
            )
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def product_reviews(self, request):
        """Get reviews for a specific product."""
        product_id = request.query_params.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'product_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reviews = Review.objects.filter(product_id=product_id)
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_reviews(self, request):
        """Get all reviews written by current user."""
        reviews = Review.objects.filter(buyer=request.user)
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)
