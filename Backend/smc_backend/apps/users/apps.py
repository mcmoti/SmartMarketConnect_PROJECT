"""
Apps configuration for users.
"""

from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.users'
    verbose_name = 'Users'
