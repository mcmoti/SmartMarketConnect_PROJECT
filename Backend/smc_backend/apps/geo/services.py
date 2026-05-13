"""
Geolocation services using Haversine formula for buyer-farmer matching.
No PostGIS required — works with standard PostgreSQL.
"""

import math
from .models import BuyerPreference, BuyerFarmerMatch
from smc_backend.apps.users.models import User
from smc_backend.apps.products.models import Product
from smc_backend.apps.analytics.models import FarmerAnalytics


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two points using Haversine formula.

    Args:
        lat1, lon1: Coordinates of point 1 (degrees)
        lat2, lon2: Coordinates of point 2 (degrees)

    Returns:
        Distance in kilometers (float)
    """
    R = 6371  # Earth's radius in km

    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    d_phi = math.radians(float(lat2) - float(lat1))
    d_lambda = math.radians(float(lon2) - float(lon1))

    a = (math.sin(d_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


class GeoMatchingService:
    """Service for geolocation-based buyer-farmer matching using Haversine formula."""

    @staticmethod
    def find_nearby_farmers(buyer, radius_km=50, crop_types=None):
        """
        Find farmers near a buyer within a radius.

        Args:
            buyer: Buyer User object (must have latitude/longitude set)
            radius_km: Search radius in kilometers
            crop_types: List of crop categories to filter

        Returns:
            List of (farmer, distance_km) tuples sorted by distance
        """
        if not buyer.geo_location:
            return []

        blat, blon = buyer.geo_location

        farmers_qs = User.objects.filter(
            role='farmer',
            latitude__isnull=False,
            longitude__isnull=False,
        ).select_related()

        if crop_types:
            farmers_qs = farmers_qs.filter(
                products__category__in=crop_types
            ).distinct()

        results = []
        for farmer in farmers_qs:
            dist = haversine_distance(blat, blon, farmer.latitude, farmer.longitude)
            if dist <= radius_km:
                results.append((farmer, dist))

        results.sort(key=lambda x: x[1])
        return results

    @staticmethod
    def find_nearby_buyers(farmer, radius_km=50, crop_types=None):
        """
        Find buyers interested in a farmer's crops within radius.

        Args:
            farmer: Farmer User object
            radius_km: Search radius in kilometers
            crop_types: List of crop types farmer produces

        Returns:
            List of (buyer, distance_km) tuples sorted by distance
        """
        if not farmer.geo_location:
            return []

        flat, flon = farmer.geo_location

        if not crop_types:
            crop_types = list(
                Product.objects.filter(farmer=farmer)
                .values_list('category', flat=True)
                .distinct()
            )

        buyers_qs = User.objects.filter(
            role='buyer',
            latitude__isnull=False,
            longitude__isnull=False,
        ).select_related()

        results = []
        for buyer in buyers_qs:
            dist = haversine_distance(flat, flon, buyer.latitude, buyer.longitude)
            if dist <= radius_km:
                # Check if buyer has matching crop preference
                try:
                    pref = buyer.buyer_preference
                    if crop_types and pref.preferred_crops:
                        if not any(c in pref.preferred_crops for c in crop_types):
                            continue
                except BuyerPreference.DoesNotExist:
                    pass
                results.append((buyer, dist))

        results.sort(key=lambda x: x[1])
        return results

    @staticmethod
    def calculate_match_score(buyer, farmer, distance_km, crop_match=True):
        """
        Calculate match score between buyer and farmer (0–100).

        Components:
        - Distance (50%): Closer is better
        - Crop match (30%): Preference match
        - Farmer rating (20%): Based on analytics
        """
        score = 0

        # Distance score (50 points max)
        distance_score = max(0, 50 - (distance_km / 50 * 50))
        score += distance_score

        # Crop match score (30 points max)
        score += 30 if crop_match else 15

        # Farmer rating score (20 points max)
        try:
            analytics = FarmerAnalytics.objects.get(farmer=farmer)
            score += (analytics.average_rating / 5.0) * 20
        except FarmerAnalytics.DoesNotExist:
            score += 10  # Default for new farmers

        return int(min(100, score))

    @staticmethod
    def create_matches_for_buyer(buyer, radius_km=None, min_score=30):
        """
        Create all relevant matches for a buyer.

        Returns:
            Number of new matches created
        """
        try:
            preference = BuyerPreference.objects.get(buyer=buyer)
            radius_km = radius_km or preference.search_radius_km
            crop_types = preference.preferred_crops
        except BuyerPreference.DoesNotExist:
            radius_km = radius_km or 50
            crop_types = []

        farmers_with_dist = GeoMatchingService.find_nearby_farmers(
            buyer, radius_km, crop_types
        )

        created_count = 0
        for farmer, distance in farmers_with_dist:
            match_score = GeoMatchingService.calculate_match_score(
                buyer, farmer, distance, bool(crop_types)
            )
            if match_score >= min_score:
                _, created = BuyerFarmerMatch.objects.update_or_create(
                    buyer=buyer,
                    farmer=farmer,
                    defaults={
                        'distance_km': distance,
                        'match_score': match_score,
                        'is_active': True,
                    }
                )
                if created:
                    created_count += 1

        return created_count

    @staticmethod
    def create_matches_for_farmer(farmer, radius_km=50, min_score=30):
        """
        Create all relevant matches for a farmer.

        Returns:
            Number of new matches created
        """
        crop_types = list(
            Product.objects.filter(farmer=farmer)
            .values_list('category', flat=True)
            .distinct()
        )

        buyers_with_dist = GeoMatchingService.find_nearby_buyers(
            farmer, radius_km, crop_types
        )

        created_count = 0
        for buyer, distance in buyers_with_dist:
            match_score = GeoMatchingService.calculate_match_score(
                buyer, farmer, distance, crop_match=True
            )
            if match_score >= min_score:
                _, created = BuyerFarmerMatch.objects.update_or_create(
                    buyer=buyer,
                    farmer=farmer,
                    defaults={
                        'distance_km': distance,
                        'match_score': match_score,
                        'is_active': True,
                    }
                )
                if created:
                    created_count += 1

        return created_count
