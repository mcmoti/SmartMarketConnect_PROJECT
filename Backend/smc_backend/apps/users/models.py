"""
User models for SMC platform.
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.

    Roles:
    - farmer: Can list produce and receive bids
    - buyer: Can browse products, bid, add to cart, and purchase
    - creditor: Can view credit scores and approve credit requests
    """

    ROLE_CHOICES = [
        ('farmer', 'Farmer'),
        ('buyer', 'Buyer'),
        ('creditor', 'Creditor'),
    ]

    # Phone validation regex for Kenyan numbers
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message='Enter phone number in international format: +254712345678. Up to 15 digits.'
    )

    phone_number = models.CharField(
        max_length=17,
        validators=[phone_regex],
        unique=True,
        help_text='Phone number in international format'
    )
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='buyer',
        help_text='User role on the platform'
    )
    profile_image = models.ImageField(
        upload_to='profile_images/',
        null=True,
        blank=True
    )
    bio = models.TextField(blank=True, default='')
    location = models.CharField(max_length=255, blank=True, default='')

    # Geolocation — plain decimal fields (no PostGIS required)
    latitude = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        null=True,
        blank=True,
        help_text='Latitude coordinate'
    )
    longitude = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        null=True,
        blank=True,
        help_text='Longitude coordinate'
    )

    # Account status
    is_verified = models.BooleanField(
        default=False,
        help_text='Phone number/email verified'
    )
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_user'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['role']),
            models.Index(fields=['is_verified']),
        ]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    def is_farmer(self):
        """Check if user is a farmer."""
        return self.role == 'farmer'

    def is_buyer(self):
        """Check if user is a buyer."""
        return self.role == 'buyer'

    def is_creditor(self):
        """Check if user is a creditor."""
        return self.role == 'creditor'

    @property
    def geo_location(self):
        """Returns (latitude, longitude) tuple or None."""
        if self.latitude is not None and self.longitude is not None:
            return (float(self.latitude), float(self.longitude))
        return None


class StaffLog(models.Model):
    """Track staff work entries for farmer operations."""

    farmer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='staff_logs',
        limit_choices_to={'role': 'farmer'}
    )
    staff_name = models.CharField(max_length=255)
    role = models.CharField(max_length=255, blank=True, default='')
    hours = models.DecimalField(max_digits=8, decimal_places=2)
    date = models.DateField()
    rate_per_hour = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_stafflog'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['farmer', 'date']),
        ]

    def __str__(self):
        return f"{self.staff_name} ({self.farmer.username}) - {self.hours}h"


class ContactInquiry(models.Model):
    """Store contact form submissions from the public frontend."""

    STATUS_CHOICES = [
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_inquiries'
    )
    name = models.CharField(max_length=255)
    email = models.EmailField()
    subject = models.CharField(max_length=255, blank=True, default='')
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users_contactinquiry'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Contact inquiry from {self.email}"


class FarmerProfile(models.Model):
    """
    Profile extension for farmers containing role-specific data.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='farmer_profile',
        limit_choices_to={'role': 'farmer'}
    )
    farm_size = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Farm size in acres')
    farming_type = models.CharField(max_length=255, blank=True, default='')
    certifications = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_farmerprofile'

    def __str__(self):
        return f"Farmer Profile for {self.user.username}"


class BuyerProfile(models.Model):
    """
    Profile extension for buyers containing role-specific data.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='buyer_profile',
        limit_choices_to={'role': 'buyer'}
    )
    business_name = models.CharField(max_length=255, blank=True, default='')
    buyer_type = models.CharField(max_length=255, blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_buyerprofile'

    def __str__(self):
        return f"Buyer Profile for {self.user.username}"

