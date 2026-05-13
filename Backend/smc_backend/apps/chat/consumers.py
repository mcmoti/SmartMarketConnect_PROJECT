"""
WebSocket consumers for real-time chat using Django Channels.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Message, Conversation


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat.
    
    Handles:
    - Connection/disconnection
    - Message receiving and broadcasting
    - Read status updates
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.conversation_group_name = f'chat_{self.conversation_id}'
        
        # Verify user is participant
        user = self.scope['user']
        is_participant = await self.check_conversation_participant(user)
        
        if not is_participant:
            await self.close()
            return
        
        # Join group
        await self.channel_layer.group_add(
            self.conversation_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        await self.channel_layer.group_discard(
            self.conversation_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Receive message from WebSocket."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'mark_read':
                await self.handle_mark_read(data)
            elif message_type in ['typing_start', 'typing_stop']:
                await self.handle_typing(data, message_type)
        except json.JSONDecodeError:
            pass
    
    async def handle_chat_message(self, data):
        """Handle incoming chat message."""
        user = self.scope['user']
        content = data.get('message', '')
        attachment_url = data.get('attachment_url', '')
        
        if not content.strip() and not attachment_url:
            return
        
        # Save message to database
        message = await self.save_message(user, content, attachment_url)
        
        # Broadcast to group
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'chat_message',
                'id': message.id,
                'sender_id': user.id,
                'sender_name': user.get_full_name(),
                'content': content,
                'attachment_url': attachment_url,
                'timestamp': message.created_at.isoformat(),
            }
        )
    
    async def handle_mark_read(self, data):
        """Handle mark as read."""
        user = self.scope['user']
        await self.mark_messages_read(user)
        
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'messages_read',
                'user_id': user.id,
            }
        )
    
    async def handle_typing(self, data, event_type):
        """Handle typing indicators."""
        user = self.scope['user']
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'user_typing',
                'event_type': event_type,
                'user_id': user.id,
                'user_name': user.get_full_name()
            }
        )

    async def chat_message(self, event):
        """Send chat message to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'id': event['id'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'content': event['content'],
            'attachment_url': event.get('attachment_url', ''),
            'timestamp': event['timestamp'],
        }))

    async def user_typing(self, event):
        """Send typing status to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': event['event_type'],
            'user_id': event['user_id'],
            'user_name': event['user_name'],
        }))
    
    async def messages_read(self, event):
        """Send read status update to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'user_id': event['user_id'],
        }))
    
    @database_sync_to_async
    def check_conversation_participant(self, user):
        """Check if user is participant in conversation."""
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            return user in [conversation.participant1, conversation.participant2]
        except Conversation.DoesNotExist:
            return False
    
    @database_sync_to_async
    def save_message(self, user, content, attachment_url):
        """Save message to database."""
        conversation = Conversation.objects.get(id=self.conversation_id)
        return Message.objects.create(
            conversation=conversation,
            sender=user,
            content=content,
            attachment_url=attachment_url if attachment_url else None
        )
    
    @database_sync_to_async
    def mark_messages_read(self, user):
        """Mark messages as read."""
        conversation = Conversation.objects.get(id=self.conversation_id)
        conversation.messages.filter(is_read=False).exclude(
            sender=user
        ).update(is_read=True)
