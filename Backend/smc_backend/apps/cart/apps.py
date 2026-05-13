"""
Apps configuration for cart.
"""

from django.apps import AppConfig


class CartConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.cart'
    verbose_name = 'Cart'
