"""
Views for user authentication and profile management.
"""

import os
import uuid

from rest_framework import status, permissions, viewsets, mixins
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateAPIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.core.files.storage import default_storage

from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserDetailSerializer,
    StaffLogSerializer,
    ContactInquirySerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
)
from .models import User, StaffLog, ContactInquiry
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings


class UserRegistrationView(APIView):
    """
    User registration endpoint.
    POST: Register a new user
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Register a new user."""
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserDetailSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'User registered successfully'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(APIView):
    """
    User login endpoint.
    POST: Authenticate and get JWT tokens
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Authenticate user and return tokens."""
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserDetailSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(RetrieveUpdateAPIView):
    """
    Get and update current user profile.
    GET: Retrieve current user details
    PATCH/PUT: Update user profile
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserDetailSerializer
    
    def get_object(self):
        """Return current authenticated user."""
        return self.request.user


class StaffLogViewSet(viewsets.ModelViewSet):
    """Create and retrieve staff logs for the authenticated farmer."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StaffLogSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['date']
    ordering_fields = ['date', 'created_at', 'hours']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        if not self.request.user.is_farmer():
            return StaffLog.objects.none()
        return StaffLog.objects.filter(farmer=self.request.user)

    def perform_create(self, serializer):
        if not self.request.user.is_farmer():
            raise permissions.PermissionDenied('Only farmers can create staff logs.')
        serializer.save(farmer=self.request.user)


class ContactInquiryViewSet(mixins.CreateModelMixin,
                            mixins.ListModelMixin,
                            viewsets.GenericViewSet):
    """Create public contact inquiries and list the authenticated user's own inquiries."""

    serializer_class = ContactInquirySerializer
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return ContactInquiry.objects.none()
        return ContactInquiry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


class MediaUploadView(APIView):
    """Upload one or more files to Django-managed media storage."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        files = request.FILES.getlist('files')
        if not files:
            return Response({'files': 'At least one file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        uploaded = []
        for file_obj in files:
            extension = os.path.splitext(file_obj.name)[1]
            filename = f"uploads/{request.user.id}/{uuid.uuid4().hex}{extension}"
            saved_path = default_storage.save(filename, file_obj)
            uploaded.append({
                'name': file_obj.name,
                'path': saved_path,
                'url': f"{settings.MEDIA_URL}{saved_path}",
            })

        return Response({'files': uploaded}, status=status.HTTP_201_CREATED)


class PasswordResetRequestView(APIView):
    """Request a password reset email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.filter(email=email).first()
            if user:
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Assuming the frontend is running on the same origin (e.g. localhost:3000)
                # or this would be constructed from frontend domain conf.
                reset_url = request.build_absolute_uri(f'/reset-password#type=recovery&uid={uid}&token={token}')
                # A quick hack to send the user to the frontend url:
                # We typically rely on CORS_ALLOWED_ORIGINS to find frontend...
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                reset_url = f"{frontend_url}/reset-password#type=recovery&uid={uid}&token={token}"

                subject = "Password Reset Requested"
                message = f"Click the link below to reset your password:\n\n{reset_url}"
                try:
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                    )
                except Exception as e:
                    return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({'message': 'If the email is found, a reset link will be sent.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """Confirm password reset."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            uid = serializer.validated_data['uid']
            token = serializer.validated_data['token']
            password = serializer.validated_data['password']

            try:
                user_id = force_str(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=user_id)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                user = None

            if user and default_token_generator.check_token(user, token):
                user.set_password(password)
                user.save()
                return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)
            return Response({'error': 'Invalid token or user ID.'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Change authenticated user password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password updated successfully.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

