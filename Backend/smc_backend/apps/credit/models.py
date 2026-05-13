"""
Credit models for farmer credit requests, credit scoring, and creditor profiles.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from smc_backend.apps.users.models import User


class CreditorProfile(models.Model):
    """
    Profile for creditors listing their lending institution details and
    tiered interest rates so farmers can select them on the loan form.
    """

    creditor = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='creditor_profile',
        limit_choices_to={'role': 'creditor'}
    )

    institution_name = models.CharField(
        max_length=255,
        help_text='e.g. Equity Bank, KWFT, SACCO name'
    )
    description = models.TextField(
        blank=True, default='',
        help_text='Brief description of the institution and lending products'
    )
    logo = models.ImageField(
        upload_to='creditor_logos/',
        null=True, blank=True
    )

    # Tiered interest rates (annual %)
    interest_rate_prime = models.DecimalField(
        max_digits=5, decimal_places=2, default=8.0,
        help_text='Interest rate for Prime borrowers (%)'
    )
    interest_rate_low = models.DecimalField(
        max_digits=5, decimal_places=2, default=12.0,
        help_text='Interest rate for Low Risk borrowers (%)'
    )
    interest_rate_medium = models.DecimalField(
        max_digits=5, decimal_places=2, default=16.0,
        help_text='Interest rate for Medium Risk borrowers (%)'
    )
    interest_rate_high = models.DecimalField(
        max_digits=5, decimal_places=2, default=22.0,
        help_text='Interest rate for High Risk borrowers (%)'
    )

    # Lending limits
    min_loan_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=5000,
        help_text='Minimum loan amount in KES'
    )
    max_loan_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=1000000,
        help_text='Maximum loan amount in KES'
    )

    # Availability
    is_accepting_applications = models.BooleanField(
        default=True,
        help_text='If False, this creditor will not appear in the farmer loan form'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'credit_creditorprofile'
        ordering = ['institution_name']

    def __str__(self):
        return f"{self.institution_name} ({self.creditor.get_full_name()})"

    def get_rate_for_classification(self, classification):
        """Return the appropriate interest rate for a given risk classification."""
        return {
            'prime': self.interest_rate_prime,
            'low': self.interest_rate_low,
            'medium': self.interest_rate_medium,
            'high': self.interest_rate_high,
        }.get(classification, self.interest_rate_high)


class CreditScore(models.Model):
    """
    Deterministic credit score for farmers.

    Score range: 0-100
    Risk tiers: prime (≥85) | low (≥70) | medium (≥40) | high (<40)
    """

    RISK_CHOICES = [
        ('prime', 'Prime'),
        ('low', 'Low Risk'),
        ('medium', 'Medium Risk'),
        ('high', 'High Risk'),
    ]

    farmer = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='credit_score',
        limit_choices_to={'role': 'farmer'}
    )

    # Score components (weighted)
    cashflow_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Based on transaction frequency and reliability (weight: 40%)'
    )
    consistency_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Based on regularity of listings and activity (weight: 30%)'
    )
    collateral_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Based on verified transaction volume (weight: 30%)'
    )

    # Overall score
    overall_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Weighted average of all components'
    )

    # Metrics used in calculation
    total_transactions = models.IntegerField(default=0)
    total_sales_volume = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text='Total amount from completed sales'
    )
    average_transaction_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    avg_monthly_cashflow = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text='Average monthly cash inflow (KES)'
    )
    days_on_platform = models.IntegerField(default=0)
    active_listings_count = models.IntegerField(default=0)
    completed_trades = models.IntegerField(default=0)

    # Risk assessment
    risk_level = models.CharField(
        max_length=10,
        choices=RISK_CHOICES,
        default='high'
    )
    prime_eligible = models.BooleanField(
        default=False,
        help_text='True when overall_score >= 85'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_calculated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'credit_creditscore'
        ordering = ['-overall_score']

    def __str__(self):
        return f"Credit Score for {self.farmer.get_full_name()} - {self.overall_score}/100 ({self.risk_level})"


class CreditRequest(models.Model):
    """
    Farmer credit/loan application directed at a specific creditor.
    Auto-classified by the scoring engine on submission.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('disbursed', 'Disbursed'),
    ]

    RISK_CLASSIFICATION_CHOICES = [
        ('prime', 'Prime'),
        ('low', 'Low Risk'),
        ('medium', 'Medium Risk'),
        ('high', 'High Risk'),
        ('unclassified', 'Unclassified'),
    ]

    farmer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='credit_requests',
        limit_choices_to={'role': 'farmer'}
    )

    # Farmer selects a creditor from the list
    target_creditor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='received_credit_requests',
        limit_choices_to={'role': 'creditor'},
        help_text='Creditor this application is directed to'
    )

    # Credit details
    amount_requested = models.DecimalField(
        max_digits=15, decimal_places=2,
        validators=[MinValueValidator(1000)],
        help_text='Amount requested in KES'
    )
    purpose = models.TextField(
        help_text='Purpose of credit (e.g., farm inputs, equipment, working capital)'
    )
    duration_months = models.IntegerField(
        default=12,
        validators=[MinValueValidator(1), MaxValueValidator(60)],
        help_text='Repayment period in months'
    )

    # Collateral & documents
    collateral_description = models.TextField(
        blank=True, default='',
        help_text='Description of collateral offered (land, equipment, produce etc)'
    )
    collateral_value = models.DecimalField(
        max_digits=15, decimal_places=2,
        null=True, blank=True,
        help_text='Estimated collateral value in KES'
    )

    # Credit scoring snapshot
    credit_score_at_request = models.IntegerField(default=0)
    recommended_amount = models.DecimalField(
        max_digits=15, decimal_places=2,
        null=True, blank=True
    )

    # Engine classification
    risk_classification = models.CharField(
        max_length=15,
        choices=RISK_CLASSIFICATION_CHOICES,
        default='unclassified',
        help_text='Auto-assigned by the credit scoring engine'
    )
    loan_to_cashflow_ratio = models.DecimalField(
        max_digits=8, decimal_places=2,
        null=True, blank=True,
        help_text='loan amount / avg monthly cashflow (lower = safer)'
    )
    suggested_interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
        help_text='Rate suggested by engine from creditor tier'
    )

    # Status and review
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='credit_reviews',
        limit_choices_to={'role': 'creditor'}
    )
    review_notes = models.TextField(blank=True, default='')

    # Decision
    is_approved = models.BooleanField(default=False)
    approval_amount = models.DecimalField(
        max_digits=15, decimal_places=2,
        null=True, blank=True
    )
    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
        help_text='Final interest rate (%) set by creditor'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'credit_creditrequest'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['farmer', 'status']),
            models.Index(fields=['target_creditor', 'status']),
            models.Index(fields=['risk_classification']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        creditor_name = self.target_creditor.get_full_name() if self.target_creditor else 'Any'
        return f"{self.farmer.get_full_name()} → {creditor_name} | {self.amount_requested} KES [{self.risk_classification}]"


class CreditDocument(models.Model):
    """
    Normalized relational model for credit request supporting documents.
    Replaces the old JSONField supporting_documents.
    """
    credit_request = models.ForeignKey(
        CreditRequest,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    document_type = models.CharField(max_length=100, blank=True, default='')
    document_url = models.CharField(max_length=500)
    verified = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'credit_creditdocument'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Document for Credit Request #{self.credit_request.id}"

