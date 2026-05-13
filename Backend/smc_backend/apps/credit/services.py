"""
Credit scoring engine — 4-tier risk classification.

Risk tiers:
  Prime    : score >= 85 AND loan_to_cashflow_ratio <= 1.5
  Low Risk : score >= 70 AND ratio <= 2.5
  Medium   : score >= 40 AND ratio <= 4.0
  High     : anything below Medium thresholds

Scoring model:
  Cashflow Reliability  40% — transaction frequency, success rate, avg value
  Consistency          30% — listing regularity, platform tenure
  Proof of Sale        30% — completed trades, total volume
"""

from django.utils import timezone
from django.db import models as django_models
from datetime import timedelta
from decimal import Decimal

from .models import CreditScore
from smc_backend.apps.transactions.models import Transaction
from smc_backend.apps.products.models import Product


# ---------------------------------------------------------------------------
# Risk tier thresholds
# ---------------------------------------------------------------------------
THRESHOLDS = {
    'prime':  {'min_score': 85, 'max_ratio': Decimal('1.5')},
    'low':    {'min_score': 70, 'max_ratio': Decimal('2.5')},
    'medium': {'min_score': 40, 'max_ratio': Decimal('4.0')},
    'high':   {'min_score': 0,  'max_ratio': None},
}

# Fallback interest rates if creditor hasn't set a profile
DEFAULT_RATES = {
    'prime':  Decimal('8.0'),
    'low':    Decimal('12.0'),
    'medium': Decimal('16.0'),
    'high':   Decimal('22.0'),
}


class CreditScoringService:
    """Service for calculating farmer credit scores and classifying loan applications."""

    # Component weights
    CASHFLOW_WEIGHT = 0.40
    CONSISTENCY_WEIGHT = 0.30
    COLLATERAL_WEIGHT = 0.30

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    def calculate_score(self, farmer):
        """
        Calculate / refresh the farmer's CreditScore object.
        Returns the updated CreditScore instance.
        """
        score_obj, _ = CreditScore.objects.get_or_create(farmer=farmer)

        cashflow_score = self._calculate_cashflow_score(farmer)
        consistency_score = self._calculate_consistency_score(farmer)
        collateral_score = self._calculate_collateral_score(farmer)

        overall_score = int(
            (cashflow_score * self.CASHFLOW_WEIGHT) +
            (consistency_score * self.CONSISTENCY_WEIGHT) +
            (collateral_score * self.COLLATERAL_WEIGHT)
        )

        risk_level = self._score_to_risk_level(overall_score)
        avg_monthly = self._get_avg_monthly_cashflow(farmer)

        total_tx, total_vol, avg_val = self._get_transaction_metrics(farmer)
        days = self._get_days_on_platform(farmer)
        active = Product.objects.filter(farmer=farmer, status='active').count()
        completed = Transaction.objects.filter(user=farmer, status='completed').count()

        score_obj.cashflow_score = cashflow_score
        score_obj.consistency_score = consistency_score
        score_obj.collateral_score = collateral_score
        score_obj.overall_score = overall_score
        score_obj.risk_level = risk_level
        score_obj.prime_eligible = (overall_score >= 85)
        score_obj.avg_monthly_cashflow = avg_monthly
        score_obj.total_transactions = total_tx
        score_obj.total_sales_volume = total_vol
        score_obj.average_transaction_value = avg_val
        score_obj.days_on_platform = days
        score_obj.active_listings_count = active
        score_obj.completed_trades = completed
        score_obj.last_calculated = timezone.now()
        score_obj.save()

        return score_obj

    def classify_loan_application(self, farmer, amount_requested, target_creditor=None):
        """
        Full classification for a loan application.

        Returns a dict:
        {
            'classification': 'prime' | 'low' | 'medium' | 'high',
            'score': int,
            'loan_to_cashflow_ratio': Decimal,
            'suggested_interest_rate': Decimal,
            'recommended_amount': Decimal,
            'breakdown': { cashflow_score, consistency_score, collateral_score,
                           avg_monthly_cashflow, risk_level }
        }
        """
        score_obj = self.calculate_score(farmer)
        amount = Decimal(str(amount_requested))

        # Loan-to-cashflow ratio: how many months of cashflow = loan amount
        monthly = score_obj.avg_monthly_cashflow or Decimal('1')
        ratio = amount / monthly if monthly > 0 else Decimal('999')
        
        # Cap the ratio to prevent numeric field overflow on max_digits=8, decimal_places=2
        ratio = min(ratio, Decimal('999999.99'))

        classification = self._classify(score_obj.overall_score, ratio)

        # Get interest rate from creditor profile if available, else default
        suggested_rate = self._get_interest_rate(classification, target_creditor)

        return {
            'classification': classification,
            'score': score_obj.overall_score,
            'loan_to_cashflow_ratio': ratio.quantize(Decimal('0.01')),
            'suggested_interest_rate': suggested_rate,
            'recommended_amount': self.calculate_recommended_amount(score_obj),
            'breakdown': {
                'cashflow_score': score_obj.cashflow_score,
                'consistency_score': score_obj.consistency_score,
                'collateral_score': score_obj.collateral_score,
                'avg_monthly_cashflow': float(score_obj.avg_monthly_cashflow),
                'risk_level': score_obj.risk_level,
                'prime_eligible': score_obj.prime_eligible,
            }
        }

    def calculate_recommended_amount(self, credit_score_obj):
        """
        Recommended credit = avg_monthly_cashflow * risk_multiplier.
        Capped at 500,000 KES, floored at 10,000 KES.
        """
        multipliers = {
            'prime':  Decimal('3.0'),
            'low':    Decimal('2.0'),
            'medium': Decimal('1.0'),
            'high':   Decimal('0.5'),
        }
        monthly = credit_score_obj.avg_monthly_cashflow or Decimal('0')
        if monthly == 0:
            return Decimal('10000')

        multiplier = multipliers.get(credit_score_obj.risk_level, Decimal('0.5'))
        recommended = monthly * multiplier
        return max(Decimal('10000'), min(Decimal('500000'), recommended))

    def get_interest_rate(self, credit_score_obj):
        """Legacy helper — returns default rate for a score object's risk level."""
        return DEFAULT_RATES.get(credit_score_obj.risk_level, Decimal('22.0'))

    # -----------------------------------------------------------------------
    # Internal scoring helpers
    # -----------------------------------------------------------------------

    def _calculate_cashflow_score(self, farmer):
        """
        Score 0-100: Transaction frequency, success rate, average value.
        """
        six_months_ago = timezone.now() - timedelta(days=180)
        transactions = Transaction.objects.filter(
            user=farmer,
            created_at__gte=six_months_ago
        )

        if not transactions.exists():
            return 0

        total = transactions.count()
        completed = transactions.filter(status='completed').count()

        # Success rate (0-40 pts)
        success_rate = (completed / total * 100) if total > 0 else 0
        success_score = min(40, success_rate * 0.4)

        # Frequency (0-40 pts) — 6+ tx in 6 months = full points
        frequency_score = min(40, (total / 6) * 40)

        # Avg value (0-20 pts) — 50,000 KES avg = full points
        avg_val = transactions.aggregate(
            avg=django_models.Avg('amount')
        )['avg'] or 0
        value_score = min(20, (float(avg_val) / 50000) * 20)

        return int(success_score + frequency_score + value_score)

    def _calculate_consistency_score(self, farmer):
        """
        Score 0-100: Listing regularity and platform tenure.
        """
        products = Product.objects.filter(farmer=farmer)
        if not products.exists():
            return 0

        days = self._get_days_on_platform(farmer)
        months = max(1, days / 30)

        # Listings per month (0-50 pts)
        listing_score = min(50, (products.count() / months) * 10)

        # Active listings (0-30 pts) — 5+ active = full points
        active_count = products.filter(status='active').count()
        listing_consistency = min(30, (active_count / 5) * 30)

        # Tenure (0-20 pts) — 6+ months = full points
        tenure_score = min(20, (days / 180) * 20)

        return int(listing_score + listing_consistency + tenure_score)

    def _calculate_collateral_score(self, farmer):
        """
        Score 0-100: Proven trade history.
        """
        total_tx, total_vol, _ = self._get_transaction_metrics(farmer)
        if total_tx == 0:
            return 0

        completed = Transaction.objects.filter(
            user=farmer, status='completed'
        ).count()

        # Completed trades (0-50 pts) — 10+ trades = full
        completed_score = min(50, (completed / 10) * 50)

        # Total volume (0-40 pts) — 250k KES = full
        volume_score = min(40, (float(total_vol) / 250000) * 40)

        # Verified (0-10 pts) — 20 verified = full
        verified_score = min(10, (completed / 20) * 10)

        return int(completed_score + volume_score + verified_score)

    def _get_avg_monthly_cashflow(self, farmer):
        """Average monthly cash inflow from completed transactions."""
        days = self._get_days_on_platform(farmer)
        months = max(1, days / 30)

        total_vol = Transaction.objects.filter(
            user=farmer, status='completed'
        ).aggregate(total=django_models.Sum('amount'))['total'] or Decimal('0')

        return Decimal(str(total_vol)) / Decimal(str(months))

    def _get_transaction_metrics(self, farmer):
        """Returns (total_count, total_volume, avg_value)."""
        qs = Transaction.objects.filter(user=farmer, status='completed')
        total_count = qs.count()
        agg = qs.aggregate(
            total=django_models.Sum('amount'),
            avg=django_models.Avg('amount')
        )
        total_vol = agg['total'] or Decimal('0')
        avg_val = agg['avg'] or Decimal('0')
        return total_count, total_vol, avg_val

    def _get_days_on_platform(self, farmer):
        if not farmer.date_joined:
            return 0
        return max(0, (timezone.now() - farmer.date_joined).days)

    def _score_to_risk_level(self, score):
        """Map score to risk level string (ignoring ratio — for raw score display)."""
        if score >= 85:
            return 'prime'
        elif score >= 70:
            return 'low'
        elif score >= 40:
            return 'medium'
        return 'high'

    def _classify(self, score, ratio):
        """
        Combined classification using both score AND loan-to-cashflow ratio.
        A heavy loan relative to cashflow can downgrade the tier.
        """
        for tier in ('prime', 'low', 'medium'):
            t = THRESHOLDS[tier]
            if score >= t['min_score'] and ratio <= t['max_ratio']:
                return tier
        return 'high'

    def _get_interest_rate(self, classification, target_creditor=None):
        """
        Get interest rate from creditor's profile tiers if available,
        otherwise fall back to platform defaults.
        """
        if target_creditor:
            try:
                profile = target_creditor.creditor_profile
                return profile.get_rate_for_classification(classification)
            except Exception:
                pass
        return DEFAULT_RATES.get(classification, Decimal('22.0'))
