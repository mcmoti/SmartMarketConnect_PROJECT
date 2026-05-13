"""
Apps configuration for market.
"""

from django.apps import AppConfig


class MarketConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.market'
    verbose_name = 'Market'
