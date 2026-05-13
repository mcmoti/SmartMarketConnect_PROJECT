"""
Serializers for credit requests, scores, and creditor profiles.
"""

from rest_framework import serializers
from .models import CreditScore, CreditRequest, CreditorProfile, CreditDocument
from smc_backend.apps.users.models import User

class CreditDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditDocument
        fields = ['id', 'document_type', 'document_url', 'verified', 'uploaded_at']


# ---------------------------------------------------------------------------
# Creditor Profile serializers
# ---------------------------------------------------------------------------

class CreditorProfileSerializer(serializers.ModelSerializer):
    """Full creditor profile — for self-management."""

    creditor_name = serializers.CharField(
        source='creditor.get_full_name', read_only=True
    )
    creditor_email = serializers.EmailField(
        source='creditor.email', read_only=True
    )
    creditor_phone = serializers.CharField(
        source='creditor.phone_number', read_only=True
    )
    creditor_photo = serializers.ImageField(
        source='creditor.profile_image', read_only=True
    )
    creditor_bio = serializers.CharField(
        source='creditor.bio', read_only=True
    )

    class Meta:
        model = CreditorProfile
        fields = [
            'id', 'creditor', 'creditor_name', 'creditor_email',
            'creditor_phone', 'creditor_photo', 'creditor_bio',
            'institution_name', 'description', 'logo',
            'interest_rate_prime', 'interest_rate_low',
            'interest_rate_medium', 'interest_rate_high',
            'min_loan_amount', 'max_loan_amount',
            'is_accepting_applications',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'creditor', 'creditor_name', 'creditor_email',
            'creditor_phone', 'creditor_photo', 'creditor_bio',
            'created_at', 'updated_at',
        ]


class CreditorListSerializer(serializers.ModelSerializer):
    """
    Public-facing creditor list — farmers use this to pick a creditor
    on the loan application form.
    """
    creditor_id = serializers.IntegerField(source='creditor.id', read_only=True)
    name = serializers.CharField(source='institution_name', read_only=True)
    contact_name = serializers.CharField(
        source='creditor.get_full_name', read_only=True
    )
    photo = serializers.ImageField(
        source='creditor.profile_image', read_only=True
    )
    bio = serializers.CharField(source='creditor.bio', read_only=True)

    # Flat rate display for the loan form
    rates = serializers.SerializerMethodField()

    class Meta:
        model = CreditorProfile
        fields = [
            'id', 'creditor_id', 'name', 'contact_name',
            'photo', 'bio', 'logo', 'description',
            'min_loan_amount', 'max_loan_amount', 'rates',
        ]

    def get_rates(self, obj):
        return {
            'prime':  str(obj.interest_rate_prime),
            'low':    str(obj.interest_rate_low),
            'medium': str(obj.interest_rate_medium),
            'high':   str(obj.interest_rate_high),
        }


# ---------------------------------------------------------------------------
# Credit Score serializers
# ---------------------------------------------------------------------------

class CreditScoreSerializer(serializers.ModelSerializer):
    """Full credit score details."""

    farmer_name = serializers.CharField(
        source='farmer.get_full_name', read_only=True
    )

    class Meta:
        model = CreditScore
        fields = [
            'id', 'farmer', 'farmer_name',
            'cashflow_score', 'consistency_score', 'collateral_score',
            'overall_score', 'risk_level', 'prime_eligible',
            'avg_monthly_cashflow',
            'total_transactions', 'total_sales_volume', 'completed_trades',
            'average_transaction_value',
            'days_on_platform', 'active_listings_count',
            'created_at', 'updated_at', 'last_calculated',
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Credit Request serializers
# ---------------------------------------------------------------------------

class CreditRequestSerializer(serializers.ModelSerializer):
    """Full credit request details (read view)."""

    farmer_name = serializers.CharField(
        source='farmer.get_full_name', read_only=True
    )
    farmer_phone = serializers.CharField(
        source='farmer.phone_number', read_only=True
    )
    farmer_photo = serializers.ImageField(
        source='farmer.profile_image', read_only=True
    )
    farmer_bio = serializers.CharField(
        source='farmer.bio', read_only=True
    )
    farmer_location = serializers.CharField(
        source='farmer.location', read_only=True
    )
    farmer_profile = serializers.SerializerMethodField()
    documents = CreditDocumentSerializer(many=True, read_only=True)

    def get_farmer_profile(self, obj):
        try:
            profile = obj.farmer.farmer_profile
            return {
                'farm_size': str(profile.farm_size) if profile.farm_size else None,
                'farming_type': profile.farming_type,
                'certifications': profile.certifications
            }
        except Exception:
            return None

    # Creditor info
    target_creditor_name = serializers.SerializerMethodField()
    reviewer_name = serializers.CharField(
        source='reviewed_by.get_full_name', read_only=True, allow_null=True
    )
    reviewer_email = serializers.EmailField(
        source='reviewed_by.email', read_only=True, allow_null=True
    )
    reviewer_phone = serializers.CharField(
        source='reviewed_by.phone_number', read_only=True, allow_null=True
    )

    class Meta:
        model = CreditRequest
        fields = [
            'id', 'farmer', 'farmer_name', 'farmer_phone',
            'farmer_photo', 'farmer_bio', 'farmer_location',
            'farmer_profile',
            'target_creditor', 'target_creditor_name',
            'amount_requested', 'purpose', 'duration_months',
            'documents', 'collateral_description', 'collateral_value',
            'credit_score_at_request', 'recommended_amount',
            'risk_classification', 'loan_to_cashflow_ratio',
            'suggested_interest_rate',
            'status', 'is_approved', 'approval_amount', 'interest_rate',
            'reviewed_by', 'reviewer_name', 'reviewer_email', 'reviewer_phone', 'review_notes',
            'created_at', 'reviewed_at', 'approved_at',
        ]
        read_only_fields = [
            'id', 'farmer', 'credit_score_at_request', 'recommended_amount',
            'risk_classification', 'loan_to_cashflow_ratio',
            'suggested_interest_rate',
            'is_approved', 'approval_amount', 'interest_rate',
            'reviewed_by', 'reviewed_at', 'approved_at', 'created_at',
        ]

    def get_target_creditor_name(self, obj):
        if not obj.target_creditor:
            return None
        try:
            return obj.target_creditor.creditor_profile.institution_name
        except Exception:
            return obj.target_creditor.get_full_name()


class CreditRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for farmer submitting a new loan application."""
    
    supporting_documents = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = CreditRequest
        fields = [
            'target_creditor',
            'amount_requested',
            'purpose',
            'duration_months',
            'supporting_documents',
            'collateral_description',
            'collateral_value',
        ]

    def validate_target_creditor(self, value):
        if value and value.role != 'creditor':
            raise serializers.ValidationError('Selected user is not a creditor.')
        if value:
            try:
                if not value.creditor_profile.is_accepting_applications:
                    raise serializers.ValidationError(
                        'This creditor is not currently accepting applications.'
                    )
            except Exception:
                pass
        return value

    def create(self, validated_data):
        from .services import CreditScoringService

        farmer = self.context['request'].user
        validated_data['farmer'] = farmer
        supporting_docs = validated_data.pop('supporting_documents', [])

        # Run scoring engine
        service = CreditScoringService()
        result = service.classify_loan_application(
            farmer=farmer,
            amount_requested=validated_data['amount_requested'],
            target_creditor=validated_data.get('target_creditor'),
        )

        validated_data['credit_score_at_request'] = result['score']
        validated_data['recommended_amount'] = result['recommended_amount']
        validated_data['risk_classification'] = result['classification']
        validated_data['loan_to_cashflow_ratio'] = result['loan_to_cashflow_ratio']
        validated_data['suggested_interest_rate'] = result['suggested_interest_rate']

        credit_request = super().create(validated_data)
        
        if isinstance(supporting_docs, list):
            for doc in supporting_docs:
                if doc:
                    CreditDocument.objects.create(
                        credit_request=credit_request,
                        document_url=doc,
                        document_type='Supporting Document'
                    )
        elif isinstance(supporting_docs, dict):
            for k, v in supporting_docs.items():
                if v:
                    CreditDocument.objects.create(
                        credit_request=credit_request,
                        document_url=v,
                        document_type=k
                    )
        
        return credit_request


class CreditRequestApprovalSerializer(serializers.Serializer):
    """Creditor approves or rejects a loan application."""

    is_approved = serializers.BooleanField(required=False, default=True)
    approval_amount = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False, allow_null=True
    )
    interest_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    review_notes = serializers.CharField(required=False, allow_blank=True)


# ---------------------------------------------------------------------------
# Applicant Dossier (creditor view)
# ---------------------------------------------------------------------------

class FarmerProductSummarySerializer(serializers.Serializer):
    """Lightweight product summary for the applicant dossier."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    category = serializers.CharField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.CharField()
    created_at = serializers.DateTimeField()


class ApplicantDossierSerializer(serializers.Serializer):
    """
    Complete dossier that a creditor sees for a loan applicant.
    Includes profile, credit score, products and collateral.
    """
    # Loan details
    loan = CreditRequestSerializer()

    # Credit score snapshot
    credit_score = CreditScoreSerializer(allow_null=True)

    # Farmer public profile
    farmer = serializers.SerializerMethodField()

    # Active produce listings
    products = FarmerProductSummarySerializer(many=True)

    def get_farmer(self, obj):
        farmer = obj['loan'].farmer
        return {
            'id': farmer.id,
            'full_name': farmer.get_full_name(),
            'username': farmer.username,
            'email': farmer.email,
            'phone_number': farmer.phone_number,
            'profile_image': farmer.profile_image.url if farmer.profile_image else None,
            'bio': farmer.bio,
            'location': farmer.location,
            'farmer_profile': {
                'farm_size': str(farmer.farmer_profile.farm_size) if hasattr(farmer, 'farmer_profile') and farmer.farmer_profile.farm_size else None,
                'farming_type': farmer.farmer_profile.farming_type if hasattr(farmer, 'farmer_profile') else '',
                'certifications': farmer.farmer_profile.certifications if hasattr(farmer, 'farmer_profile') else ''
            },
            'days_on_platform': (
                __import__('django.utils.timezone', fromlist=['now']).now() - farmer.date_joined
            ).days if farmer.date_joined else 0,
            'is_verified': farmer.is_verified,
        }
