"""
Routing configuration for AI Agent WebSockets.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/ai/chat/$', consumers.AIAgentConsumer.as_asgi()),
]
