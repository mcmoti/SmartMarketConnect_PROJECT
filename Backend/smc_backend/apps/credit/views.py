"""
Views for credit requests, scoring, creditor profiles, and applicant dossiers.
"""

from rest_framework import viewsets, status, permissions, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from django.utils import timezone

from .models import CreditScore, CreditRequest, CreditorProfile
from .serializers import (
    CreditScoreSerializer,
    CreditRequestSerializer,
    CreditRequestCreateSerializer,
    CreditRequestApprovalSerializer,
    CreditorProfileSerializer,
    CreditorListSerializer,
    ApplicantDossierSerializer,
)
from .services import CreditScoringService
from smc_backend.apps.products.models import Product


# ---------------------------------------------------------------------------
# Creditor Profile ViewSet
# ---------------------------------------------------------------------------

class CreditorProfileViewSet(viewsets.ModelViewSet):
    """
    Manages creditor lending profiles.

    Public:  GET /api/credit/creditors/          → list accepting creditors (for farmer dropdown)
    Private: GET/PATCH /api/credit/creditors/me/ → creditor manages own profile
    """
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['institution_name', 'description']
    ordering_fields = ['institution_name', 'interest_rate_prime']
    ordering = ['institution_name']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_creditor():
            # Creditors can see all profiles (to compare) but only edit their own
            return CreditorProfile.objects.all()
        # Farmers/buyers only see accepting creditors
        return CreditorProfile.objects.filter(is_accepting_applications=True)

    def get_serializer_class(self):
        user = self.request.user
        # Farmers get the simplified public list view
        if not user.is_creditor() and self.action in ('list', 'retrieve'):
            return CreditorListSerializer
        return CreditorProfileSerializer

    def perform_create(self, serializer):
        if not self.request.user.is_creditor():
            raise permissions.PermissionDenied('Only creditors can create a lending profile.')
        if CreditorProfile.objects.filter(creditor=self.request.user).exists():
            raise permissions.PermissionDenied('You already have a lending profile. Use PATCH to update it.')
        serializer.save(creditor=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.creditor != self.request.user:
            raise permissions.PermissionDenied('You can only edit your own profile.')
        serializer.save()

    @action(detail=False, methods=['get', 'patch', 'put'], url_path='me')
    def me(self, request):
        """Creditor retrieves or updates their own lending profile."""
        if not request.user.is_creditor():
            raise permissions.PermissionDenied('Only creditors can access this.')

        profile = CreditorProfile.objects.filter(creditor=request.user).first()

        if request.method == 'GET':
            if not profile:
                return Response(
                    {'detail': 'You have not created a lending profile yet.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(CreditorProfileSerializer(profile).data)

        # PATCH / PUT — create or update
        if profile:
            serializer = CreditorProfileSerializer(
                profile, data=request.data, partial=(request.method == 'PATCH')
            )
        else:
            serializer = CreditorProfileSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        serializer.save(creditor=request.user)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Credit Score ViewSet
# ---------------------------------------------------------------------------

class CreditScoreViewSet(viewsets.ReadOnlyModelViewSet):
    """
    - Farmers view their own score
    - Creditors view all scores
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CreditScoreSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['risk_level', 'prime_eligible']
    ordering_fields = ['overall_score', 'last_calculated']
    ordering = ['-overall_score']

    def get_queryset(self):
        user = self.request.user
        if user.is_creditor():
            return CreditScore.objects.select_related('farmer').all()
        elif user.is_farmer():
            return CreditScore.objects.filter(farmer=user)
        return CreditScore.objects.none()

    @action(detail=False, methods=['post'])
    def recalculate(self, request):
        """Farmer recalculates their own credit score."""
        if not request.user.is_farmer():
            raise permissions.PermissionDenied('Only farmers can recalculate their score.')

        service = CreditScoringService()
        score = service.calculate_score(request.user)
        return Response(CreditScoreSerializer(score).data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Credit Request ViewSet
# ---------------------------------------------------------------------------

class CreditRequestViewSet(viewsets.ModelViewSet):
    """
    Farmer-to-Creditor loan applications.

    Farmers:   create + view own requests + check classification
    Creditors: view requests directed at them + approve/reject + view applicant dossier
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['status', 'risk_classification']
    search_fields = ['farmer__first_name', 'farmer__last_name', 'purpose']
    ordering_fields = ['created_at', 'amount_requested', 'credit_score_at_request']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_creditor():
            # Creditors see only requests directed at them
            return CreditRequest.objects.filter(
                target_creditor=user
            ).select_related('farmer', 'target_creditor', 'reviewed_by')
        elif user.is_farmer():
            return CreditRequest.objects.filter(
                farmer=user
            ).select_related('farmer', 'target_creditor', 'reviewed_by')
        return CreditRequest.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return CreditRequestCreateSerializer
        return CreditRequestSerializer

    def perform_create(self, serializer):
        if not self.request.user.is_farmer():
            raise permissions.PermissionDenied('Only farmers can apply for credit.')
        serializer.save()

    def perform_update(self, serializer):
        obj = self.get_object()
        if obj.farmer != self.request.user:
            raise permissions.PermissionDenied()
        if obj.status != 'pending':
            raise permissions.PermissionDenied('Can only edit pending applications.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.farmer != self.request.user:
            raise permissions.PermissionDenied()
        if instance.status != 'pending':
            raise permissions.PermissionDenied('Can only delete pending applications.')
        instance.delete()

    # ------------------------------------------------------------------
    # Creditor actions
    # ------------------------------------------------------------------

    @action(detail=True, methods=['get'], url_path='applicant-profile')
    def applicant_profile(self, request, pk=None):
        """
        Full applicant dossier for creditors:
        - Farmer profile (photo, bio, location, profile_data)
        - Active produce listings
        - Credit score breakdown
        - Loan details (amount, purpose, collateral, classification)
        """
        if not request.user.is_creditor():
            raise permissions.PermissionDenied('Only creditors can access applicant profiles.')

        credit_request = self.get_object()
        farmer = credit_request.farmer

        # Recalculate score on demand for freshness
        service = CreditScoringService()
        score_obj = service.calculate_score(farmer)

        products = Product.objects.filter(
            farmer=farmer, status='active'
        ).values(
            'id', 'name', 'category', 'quantity', 'unit', 'price', 'status', 'created_at'
        )

        data = {
            'loan': credit_request,
            'credit_score': score_obj,
            'products': list(products),
        }

        serializer = ApplicantDossierSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Creditor approves a loan application."""
        if not request.user.is_creditor():
            raise permissions.PermissionDenied('Only creditors can approve requests.')

        credit_request = self.get_object()

        if credit_request.target_creditor != request.user:
            raise permissions.PermissionDenied('This application is not directed at you.')

        serializer = CreditRequestApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        credit_request.status = 'approved'
        credit_request.is_approved = vd.get('is_approved', True)
        credit_request.reviewed_by = request.user
        credit_request.reviewed_at = timezone.now()
        credit_request.approved_at = timezone.now()
        credit_request.approval_amount = vd.get('approval_amount')
        credit_request.interest_rate = vd.get('interest_rate')
        credit_request.review_notes = vd.get('review_notes', '')
        credit_request.save()

        # Create disbursement transaction
        from smc_backend.apps.transactions.models import Transaction
        Transaction.objects.create(
            user=credit_request.farmer,
            amount=credit_request.approval_amount or credit_request.amount_requested,
            transaction_type='credit_disbursement',
            status='completed',
            credit_request=credit_request,
            description=f'Credit disbursement — {credit_request.purpose}'
        )

        return Response(CreditRequestSerializer(credit_request).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Creditor rejects a loan application."""
        if not request.user.is_creditor():
            raise permissions.PermissionDenied('Only creditors can reject requests.')

        credit_request = self.get_object()

        if credit_request.target_creditor != request.user:
            raise permissions.PermissionDenied('This application is not directed at you.')

        credit_request.status = 'rejected'
        credit_request.is_approved = False
        credit_request.reviewed_by = request.user
        credit_request.reviewed_at = timezone.now()
        credit_request.review_notes = request.data.get('review_notes', '')
        credit_request.save()

        return Response(CreditRequestSerializer(credit_request).data)
