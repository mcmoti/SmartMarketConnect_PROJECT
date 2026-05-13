"""
Chat models for direct messaging between buyers and farmers.
"""

from django.db import models
from django.db.models import Q
from smc_backend.apps.users.models import User
from django_cryptography.fields import encrypt


class Conversation(models.Model):
    """
    One-to-one conversation between two users.
    """
    participant1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations_as_p1'
    )
    participant2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations_as_p2'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_conversation'
        indexes = [
            models.Index(fields=['participant1', 'participant2']),
        ]
        unique_together = [
            ['participant1', 'participant2']
        ]
    
    def __str__(self):
        return f"Conversation between {self.participant1.username} and {self.participant2.username}"
    
    def get_other_participant(self, user):
        """Get the other participant in conversation."""
        return self.participant2 if user == self.participant1 else self.participant1
    
    def get_latest_message(self):
        """Get the most recent message in conversation."""
        return self.messages.order_by('-created_at').first()


class Message(models.Model):
    """
    Individual message in a conversation.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='messages_sent'
    )
    content = encrypt(models.TextField())
    attachment_url = models.URLField(max_length=500, blank=True, null=True)
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_message'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender']),
        ]
    
    def __str__(self):
        return f"Message from {self.sender.username} in {self.conversation}"
