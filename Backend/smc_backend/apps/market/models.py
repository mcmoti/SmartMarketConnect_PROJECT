"""
Market price models for tracking real-time and historical crop prices.

Schema notes:
  - Each fetch creates a NEW MarketPrice row (historical record).
  - The `market` field stores the market location (e.g. "Nairobi").
  - `recorded_at` is set at creation time and never changes.
  - For the quick-lookup API we read the latest row per (crop_name, market).
"""

from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class MarketPrice(models.Model):
    """
    Immutable time-series price record.

    One row is inserted per fetch so we have full history for trend analysis.
    """

    TREND_CHOICES = [
        ("up", "Up"),
        ("down", "Down"),
        ("stable", "Stable"),
    ]

    crop_name = models.CharField(max_length=255, db_index=True)
    category = models.CharField(max_length=100, default="general", db_index=True)

    # Location of the market (e.g. "Nairobi", "Mombasa", "Kisumu")
    market = models.CharField(max_length=255, default="Nairobi", db_index=True)

    # Price information
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text="Price per unit (e.g., per kg) in KES",
    )
    unit = models.CharField(max_length=50, default="kg")

    # Statistics snapshot (populated by service / tasks)
    min_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Minimum market price at time of record",
    )
    max_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Maximum market price at time of record",
    )
    average_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Average market price at time of record",
    )

    # Trend relative to previous record for same commodity+market
    price_trend = models.CharField(
        max_length=20, choices=TREND_CHOICES, default="stable"
    )

    # Data provenance
    source = models.CharField(
        max_length=255, blank=True, default="",
        help_text="e.g. 'nextyield', 'kamis_fallback', 'db_cache', 'blended'",
    )

    # When this record was captured (immutable after creation)
    recorded_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        help_text="Timestamp when this price was recorded",
    )

    # Legacy compatibility fields (auto-managed)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "market_marketprice"
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["crop_name", "market", "-recorded_at"]),
            models.Index(fields=["category"]),
            models.Index(fields=["recorded_at"]),
        ]

    def __str__(self):
        return (
            f"{self.crop_name} @ {self.market} — "
            f"{self.unit_price} KES/{self.unit} "
            f"[{self.recorded_at.strftime('%Y-%m-%d %H:%M')}]"
        )
