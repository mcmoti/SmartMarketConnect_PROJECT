"""
Apps configuration for transactions.
"""

from django.apps import AppConfig


class TransactionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.transactions'
    verbose_name = 'Transactions'
