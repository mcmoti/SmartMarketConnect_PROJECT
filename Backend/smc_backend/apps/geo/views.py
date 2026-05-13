"""
Views for geolocation and buyer-farmer matching.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import BuyerPreference, BuyerFarmerMatch
from .serializers import BuyerPreferenceSerializer, BuyerFarmerMatchSerializer
from .services import GeoMatchingService


class BuyerPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for buyer preferences and search settings.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BuyerPreferenceSerializer

    def get_queryset(self):
        if self.request.user.is_buyer():
            return BuyerPreference.objects.filter(buyer=self.request.user)
        return BuyerPreference.objects.none()

    def perform_create(self, serializer):
        if not self.request.user.is_buyer():
            raise permissions.PermissionDenied('Only buyers can set preferences.')
        BuyerPreference.objects.filter(buyer=self.request.user).delete()
        serializer.save(buyer=self.request.user)

    @action(detail=False, methods=['get', 'post'])
    def my_preference(self, request):
        """Get or update preference for current buyer."""
        if not request.user.is_buyer():
            raise permissions.PermissionDenied()

        if request.method == 'GET':
            preference, _ = BuyerPreference.objects.get_or_create(buyer=request.user)
            return Response(BuyerPreferenceSerializer(preference).data)

        preference, _ = BuyerPreference.objects.get_or_create(buyer=request.user)
        serializer = BuyerPreferenceSerializer(preference, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BuyerFarmerMatchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing buyer-farmer matches.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BuyerFarmerMatchSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_buyer():
            return BuyerFarmerMatch.objects.filter(buyer=user, is_active=True).order_by('-match_score')
        elif user.is_farmer():
            return BuyerFarmerMatch.objects.filter(farmer=user, is_active=True).order_by('-match_score')
        return BuyerFarmerMatch.objects.none()

    @action(detail=False, methods=['post'])
    def find_matches(self, request):
        """
        Find and create matches for current user.
        Buyers → find nearby farmers; Farmers → find nearby buyers.
        """
        user = request.user

        if not user.geo_location:
            return Response(
                {'error': 'Location not set. Please update your latitude and longitude.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.is_buyer():
            count = GeoMatchingService.create_matches_for_buyer(user)
        elif user.is_farmer():
            count = GeoMatchingService.create_matches_for_farmer(user)
        else:
            return Response({'error': 'Invalid user role'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': f'Created/updated {count} matches', 'count': count})

    @action(detail=True, methods=['post'])
    def mark_interaction(self, request, pk=None):
        """Mark that user has interacted with matched user."""
        match = self.get_object()

        if request.user not in [match.buyer, match.farmer]:
            raise permissions.PermissionDenied()

        match.interaction_count += 1
        match.last_interaction = timezone.now()
        match.save()
        return Response({'message': 'Interaction recorded'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def nearby_farmers(self, request):
        """Get nearby farmers for buyer."""
        if not request.user.is_buyer():
            raise permissions.PermissionDenied('Only buyers can search for farmers.')

        if not request.user.geo_location:
            return Response({'error': 'Location not set'}, status=status.HTTP_400_BAD_REQUEST)

        radius_km = int(request.query_params.get('radius', 50))
        crop_types = request.query_params.getlist('crops')

        farmers_with_dist = GeoMatchingService.find_nearby_farmers(
            request.user, radius_km, crop_types if crop_types else None
        )

        from smc_backend.apps.users.serializers import UserListSerializer
        return Response({
            'count': len(farmers_with_dist),
            'radius_km': radius_km,
            'farmers': [
                {**UserListSerializer(farmer).data, 'distance_km': round(dist, 2)}
                for farmer, dist in farmers_with_dist
            ]
        })

    @action(detail=False, methods=['get'])
    def nearby_buyers(self, request):
        """Get nearby buyers for farmer."""
        if not request.user.is_farmer():
            raise permissions.PermissionDenied('Only farmers can search for buyers.')

        if not request.user.geo_location:
            return Response({'error': 'Location not set'}, status=status.HTTP_400_BAD_REQUEST)

        radius_km = int(request.query_params.get('radius', 50))

        buyers_with_dist = GeoMatchingService.find_nearby_buyers(request.user, radius_km)

        from smc_backend.apps.users.serializers import UserListSerializer
        return Response({
            'count': len(buyers_with_dist),
            'radius_km': radius_km,
            'buyers': [
                {**UserListSerializer(buyer).data, 'distance_km': round(dist, 2)}
                for buyer, dist in buyers_with_dist
            ]
        })
