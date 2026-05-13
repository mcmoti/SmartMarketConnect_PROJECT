"""
Geolocation models for buyer-farmer matching.
Uses plain decimal lat/lng fields (no PostGIS required).
Distance calculated via Haversine formula in services.py.
"""

from django.db import models
from smc_backend.apps.users.models import User
from smc_backend.apps.products.models import Product


class BuyerPreference(models.Model):
    """
    Buyer crop preferences and search radius.
    """

    buyer = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='buyer_preference',
        limit_choices_to={'role': 'buyer'}
    )

    # Search radius in kilometers
    search_radius_km = models.IntegerField(
        default=50,
        help_text='Search radius for farmer matching'
    )

    # Quality preference
    min_rating = models.FloatField(
        default=3.0,
        help_text='Minimum farmer rating to match'
    )

    # Notification preferences
    notify_on_match = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'geo_buyerpreference'

    def __str__(self):
        return f"Preference for {self.buyer.get_full_name() or self.buyer.username}"


class BuyerFarmerMatch(models.Model):
    """
    Matched buyer-farmer pairs based on geolocation and preferences.
    """

    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='farmer_matches',
        limit_choices_to={'role': 'buyer'}
    )
    farmer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='buyer_matches',
        limit_choices_to={'role': 'farmer'}
    )

    # Distance in kilometers (computed via Haversine)
    distance_km = models.FloatField()

    # Match score (0-100)
    match_score = models.IntegerField(default=0)

    # Status
    is_active = models.BooleanField(default=True)
    interaction_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    last_interaction = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'geo_buyerfarmermatch'
        unique_together = [['buyer', 'farmer']]
        indexes = [
            models.Index(fields=['buyer', 'match_score']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"Match: {self.buyer.username} ↔ {self.farmer.username} ({self.distance_km:.1f}km)"


class Crop(models.Model):
    """
    Normalized relational model for crops.
    """
    name = models.CharField(max_length=255, unique=True)
    
    class Meta:
        db_table = 'geo_crop'
        ordering = ['name']

    def __str__(self):
        return self.name


class BuyerPreferredCrop(models.Model):
    """
    Normalized relational model for buyer crop preferences.
    Replaces the old JSONField preferred_crops.
    """
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='preferred_crops_rel',
        limit_choices_to={'role': 'buyer'}
    )
    crop = models.ForeignKey(
        Crop,
        on_delete=models.CASCADE,
        related_name='preferred_by_buyers'
    )

    class Meta:
        db_table = 'geo_buyerpreferredcrop'
        unique_together = [['buyer', 'crop']]

    def __str__(self):
        return f"{self.buyer.username} prefers {self.crop.name}"

