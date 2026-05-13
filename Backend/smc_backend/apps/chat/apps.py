"""
Apps configuration for chat.
"""

from django.apps import AppConfig


class ChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.chat'
    verbose_name = 'Chat'
