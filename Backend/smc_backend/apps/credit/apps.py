"""
Apps configuration for credit.
"""

from django.apps import AppConfig


class CreditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.credit'
    verbose_name = 'Credit'
