"""
Serializers for chat messaging.
"""

from rest_framework import serializers
from .models import Conversation, Message
from smc_backend.apps.users.serializers import UserListSerializer


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages."""
    
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_details = UserListSerializer(source='sender', read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_name', 'sender_details',
            'content', 'attachment_url', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'sender', 'created_at']


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for sending messages."""
    
    class Meta:
        model = Message
        fields = ['content']


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversations with latest message."""
    
    participant1_details = UserListSerializer(source='participant1', read_only=True)
    participant2_details = UserListSerializer(source='participant2', read_only=True)
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'participant1', 'participant1_details',
            'participant2', 'participant2_details',
            'latest_message', 'unread_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_latest_message(self, obj):
        """Get the latest message if exists."""
        latest = obj.get_latest_message()
        if latest:
            return MessageSerializer(latest).data
        return None
    
    def get_unread_count(self, obj):
        """Get count of unread messages for current user."""
        user = self.context['request'].user
        other_participant = obj.get_other_participant(user)
        return obj.messages.filter(sender=other_participant, is_read=False).count()


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Serializer for conversation detail with all messages."""
    
    participant1_details = UserListSerializer(source='participant1', read_only=True)
    participant2_details = UserListSerializer(source='participant2', read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'participant1', 'participant1_details',
            'participant2', 'participant2_details',
            'messages', 'created_at', 'updated_at'
        ]
        read_only_fields = fields
