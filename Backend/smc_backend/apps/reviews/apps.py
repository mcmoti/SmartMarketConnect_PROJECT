"""
Apps configuration for reviews.
"""

from django.apps import AppConfig


class ReviewsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.reviews'
    verbose_name = 'Reviews'
