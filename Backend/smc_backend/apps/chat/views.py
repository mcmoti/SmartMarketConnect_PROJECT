"""
Views for chat messaging.
"""

from rest_framework import viewsets, status, permissions, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
    MessageCreateSerializer
)


class ConversationViewSet(viewsets.ViewSet):
    """
    ViewSet for managing conversations.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """List all conversations for current user."""
        conversations = Conversation.objects.filter(
            Q(participant1=request.user) | Q(participant2=request.user)
        ).order_by('-updated_at')
        
        serializer = ConversationSerializer(
            conversations,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """Get conversation details with messages."""
        conversation = get_object_or_404(
            Conversation,
            id=pk,
            **{
                'participant1': request.user
            } if request.query_params.get('as_p1') else {
                'participant2': request.user
            }
        )
        
        # Alternative: Check if user is either participant
        conversation = get_object_or_404(
            Conversation,
            id=pk
        )
        
        if request.user not in [conversation.participant1, conversation.participant2]:
            raise permissions.PermissionDenied(
                'You are not a participant in this conversation.'
            )
        
        # Mark messages as read
        conversation.messages.filter(is_read=False).exclude(
            sender=request.user
        ).update(is_read=True)
        
        serializer = ConversationDetailSerializer(conversation)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start a new conversation with another user."""
        other_user_id = request.data.get('other_user_id')
        
        if not other_user_id:
            return Response(
                {'error': 'other_user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from smc_backend.apps.users.models import User
        other_user = get_object_or_404(User, id=other_user_id)
        
        if other_user == request.user:
            return Response(
                {'error': 'Cannot start conversation with yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create conversation
        conversation, created = Conversation.objects.get_or_create(
            participant1__in=[request.user, other_user],
            participant2__in=[request.user, other_user],
            defaults={
                'participant1': request.user,
                'participant2': other_user
            }
        )
        
        serializer = ConversationSerializer(
            conversation,
            context={'request': request}
        )
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class MessageViewSet(viewsets.ViewSet):
    """
    ViewSet for managing messages.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """List messages in a conversation."""
        conversation_id = request.query_params.get('conversation_id')
        
        if not conversation_id:
            return Response(
                {'error': 'conversation_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        if request.user not in [conversation.participant1, conversation.participant2]:
            raise permissions.PermissionDenied()
        
        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    def create(self, request):
        """Send a message."""
        conversation_id = request.data.get('conversation_id')
        
        if not conversation_id:
            return Response(
                {'error': 'conversation_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        if request.user not in [conversation.participant1, conversation.participant2]:
            raise permissions.PermissionDenied()
        
        serializer = MessageCreateSerializer(data=request.data)
        if serializer.is_valid():
            message = Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=serializer.validated_data['content']
            )
            
            # Mark conversation as updated
            conversation.save()
            
            return Response(
                MessageSerializer(message).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        """Mark messages as read."""
        conversation_id = request.data.get('conversation_id')
        
        if not conversation_id:
            return Response(
                {'error': 'conversation_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        if request.user not in [conversation.participant1, conversation.participant2]:
            raise permissions.PermissionDenied()
        
        conversation.messages.filter(is_read=False).exclude(
            sender=request.user
        ).update(is_read=True)
        
        return Response(
            {'message': 'Messages marked as read'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], parser_classes=[parsers.MultiPartParser])
    def upload_attachment(self, request):
        """Upload an attachment and return its URL."""
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_file = request.FILES['file']
        
        # Save file to media storage
        from django.core.files.storage import default_storage
        file_path = default_storage.save(f'chat_attachments/{uploaded_file.name}', uploaded_file)
        file_url = request.build_absolute_uri(default_storage.url(file_path))
        
        return Response(
            {'attachment_url': file_url},
            status=status.HTTP_201_CREATED
        )
