"""
Apps configuration for payments.
"""

from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.payments'
    verbose_name = 'Payments'
