"""
ASGI config for SMC project with WebSocket support via Django Channels.
"""

import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smc_backend.config.settings.dev')

# Initialize Django before importing channel routing
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from smc_backend.apps.chat.routing import websocket_urlpatterns as chat_urls
from smc_backend.apps.ai_agent.routing import websocket_urlpatterns as ai_urls

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(
            chat_urls + ai_urls
        )
    ),
})
