"""
Apps configuration for analytics.
"""

from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.analytics'
    verbose_name = 'Analytics'
