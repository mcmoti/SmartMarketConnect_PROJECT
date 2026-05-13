"""
Apps configuration for geolocation.
"""

from django.apps import AppConfig


class GeoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.geo'
    verbose_name = 'Geolocation'
