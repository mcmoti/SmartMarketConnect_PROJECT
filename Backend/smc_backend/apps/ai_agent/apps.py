"""
Apps configuration for AI Agent.
"""

from django.apps import AppConfig


class AIAgentConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smc_backend.apps.ai_agent'
    verbose_name = 'AI Agent'
