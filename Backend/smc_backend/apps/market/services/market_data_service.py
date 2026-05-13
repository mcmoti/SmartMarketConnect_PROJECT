"""
Market Data Service — Fault-tolerant, production-ready integration layer.

Primary source  : UjuziKilimo API
Fallback source : KAMIS static reference prices
Final fallback  : Latest cached DB value

Caching strategy:
  - Redis (TTL 20 min) checked first
  - External API called on cache miss
  - Every successful response persisted to DB for offline fallback

Price blending (when farmer listings exist):
  blended = 0.70 * external_price + 0.30 * avg_farmer_listing_price
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal, InvalidOperation
from typing import Optional, TypedDict

import requests
from django.conf import settings
from django.core.cache import cache
from django.db import DatabaseError
from django.utils import timezone

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
UJUZIKILIMO_BASE_URL = getattr(
    settings, "UJUZIKILIMO_BASE_URL", "https://farmsuite.ujuzikilimo.com/api"
)
UJUZIKILIMO_API_KEY = os.getenv("UJUZIKILIMO_API_KEY", "")

REQUEST_TIMEOUT = 5          # seconds
MAX_RETRIES = 2
CACHE_TTL = 20 * 60          # 20 minutes in seconds
REDIS_KEY_PREFIX = "smc:market"

# KAMIS fallback reference prices (KES per kg, rough averages for Kenya)
KAMIS_FALLBACK: dict[str, dict] = {
    "maize":    {"price": 45.0, "category": "cereals"},
    "beans":    {"price": 120.0, "category": "pulses"},
    "rice":     {"price": 130.0, "category": "cereals"},
    "potatoes": {"price": 35.0, "category": "tubers"},
    "tomatoes": {"price": 80.0, "category": "vegetables"},
    "onions":   {"price": 70.0, "category": "vegetables"},
    "cabbage":  {"price": 30.0, "category": "vegetables"},
    "carrots":  {"price": 55.0, "category": "vegetables"},
    "wheat":    {"price": 60.0, "category": "cereals"},
    "kales":    {"price": 25.0, "category": "vegetables"},
}

# ---------------------------------------------------------------------------
# Typed return shapes
# ---------------------------------------------------------------------------

class PriceRecord(TypedDict):
    commodity: str
    market: str
    price: float
    currency: str
    source: str                # "nextyield" | "kamis_fallback" | "db_cache" | "blended"
    timestamp: str             # ISO 8601
    fallback_used: bool


class TrendPoint(TypedDict):
    date: str
    price: float


class TrendResult(TypedDict):
    commodity: str
    market: str
    data: list[TrendPoint]
    trend: str                 # "up" | "down" | "stable"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _redis_key(commodity: str, market: str) -> str:
    return f"{REDIS_KEY_PREFIX}:{commodity.lower()}:{market.lower()}"


def _now_iso() -> str:
    return timezone.now().isoformat()


def _get_ujuzikilimo_token() -> Optional[str]:
    """Generates and caches an access token from UjuziKilimo."""
    cache_key = "smc:ujuzikilimo:auth_token"
    token = cache.get(cache_key)
    if token:
        return token

    if not UJUZIKILIMO_API_KEY:
        logger.warning("UJUZIKILIMO_API_KEY not set — skipping primary API call.")
        return None

    url = f"{UJUZIKILIMO_BASE_URL}/v1/auth/generate-token"
    payload = {
        "api_key": UJUZIKILIMO_API_KEY,
        "email": "motisomark0@gmail.com",
        "password": "Temp2340@#",
        "device_name": "SMC Backend App"
    }

    try:
        resp = requests.post(url, json=payload, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        
        # Token could be at the root level or nested inside data
        new_token = None
        if "token" in data:
            new_token = data["token"]
        elif "data" in data and isinstance(data["data"], dict) and "token" in data["data"]:
            new_token = data["data"]["token"]

        if new_token:
            cache.set(cache_key, new_token, timeout=3500) # Expire slightly before 1h
            return new_token
        else:
            logger.error("Could not extract token from UjuziKilimo response.")
            return None
    except Exception as exc:
        logger.error("Failed to generate UjuziKilimo token: %s", exc)
        return None


def _fetch_from_ujuzikilimo(commodity: str, market: str) -> Optional[float]:
    """
    Call UjuziKilimo API with timeout and up to MAX_RETRIES attempts.
    Returns the price as a float, or None on any error.
    """
    token = _get_ujuzikilimo_token()
    if not token:
        return None

    url = f"{UJUZIKILIMO_BASE_URL}/market_data/prices"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"commodity": commodity, "market": market}

    for attempt in range(1, MAX_RETRIES + 2):          # 1 initial + MAX_RETRIES
        try:
            resp = requests.get(
                url, headers=headers, params=params, timeout=REQUEST_TIMEOUT
            )
            resp.raise_for_status()
            data = resp.json()
            
            price = None
            if isinstance(data, dict):
                # If price is at the root
                price_val = data.get("price") or data.get("unit_price")
                if price_val:
                    price = float(price_val)
                # If price is nested in "data" payload
                elif "data" in data and isinstance(data["data"], dict):
                    price_val = data["data"].get("price") or data["data"].get("unit_price")
                    if price_val:
                        price = float(price_val)

            if price is not None and price > 0:
                logger.info(
                    "UjuziKilimo API: %s @ %s = %.2f KES (attempt %d)",
                    commodity, market, price, attempt,
                )
                return price
            logger.warning("UjuziKilimo returned zero/missing price for %s", commodity)
            return None

        except requests.exceptions.Timeout:
            logger.warning(
                "UjuziKilimo timeout (attempt %d/%d) for %s",
                attempt, MAX_RETRIES + 1, commodity,
            )
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response else "?"
            if status == 401:
                logger.error("UjuziKilimo: invalid or expired token (401). Clearing cache.")
                cache.delete("smc:ujuzikilimo:auth_token")
                # Try getting a new token on next attempt
                token = _get_ujuzikilimo_token()
                if not token:
                    return None
            else:
                logger.warning("UjuziKilimo HTTP %s (attempt %d)", status, attempt)
        except (requests.exceptions.ConnectionError, requests.exceptions.RequestException) as exc:
            logger.warning("UjuziKilimo connection error (attempt %d): %s", attempt, exc)
        except (ValueError, KeyError) as exc:
            logger.warning("UjuziKilimo bad response JSON: %s", exc)
            return None

    return None


def _fetch_from_kamis(commodity: str) -> Optional[float]:
    """
    KAMIS static fallback prices. In production, replace with HTTP call
    to the actual KAMIS endpoint or scheduled scrape.
    """
    entry = KAMIS_FALLBACK.get(commodity.lower())
    if entry:
        logger.info("KAMIS fallback: %s = %.2f KES", commodity, entry["price"])
        return entry["price"]
    return None


def _fetch_from_db(commodity: str, market: str) -> Optional[float]:
    """Return the most recent cached DB price for this commodity/market pair."""
    from smc_backend.apps.market.models import MarketPrice
    try:
        obj = (
            MarketPrice.objects
            .filter(crop_name__iexact=commodity, market__iexact=market)
            .order_by("-recorded_at")
            .first()
        )
        if obj:
            logger.info(
                "DB cache fallback: %s @ %s = %.2f (recorded %s)",
                commodity, market, obj.unit_price, obj.recorded_at,
            )
            return float(obj.unit_price)

        # Try without market filter as last resort
        obj = (
            MarketPrice.objects
            .filter(crop_name__iexact=commodity)
            .order_by("-recorded_at")
            .first()
        )
        if obj:
            return float(obj.unit_price)
    except DatabaseError as exc:
        logger.error("DB fallback query failed: %s", exc)
    return None


def _get_avg_farmer_price(commodity: str) -> Optional[float]:
    """
    Average price from active farmer Product listings for blending.
    """
    from smc_backend.apps.products.models import Product
    try:
        from django.db.models import Avg
        result = (
            Product.objects
            .filter(name__iexact=commodity, status="active")
            .aggregate(avg_price=Avg("price"))
        )
        avg = result.get("avg_price")
        return float(avg) if avg else None
    except Exception as exc:
        logger.warning("Failed to fetch farmer avg price for blending: %s", exc)
        return None


def _persist_price(commodity: str, market: str, price: float, source: str, category: str = "general"):
    """
    Save the fetched price to DB (historical record) and update Redis cache.
    Non-blocking: errors are logged but not re-raised.
    """
    from smc_backend.apps.market.models import MarketPrice
    try:
        # Determine trend by comparing to previous entry
        prev = (
            MarketPrice.objects
            .filter(crop_name__iexact=commodity, market__iexact=market)
            .order_by("-recorded_at")
            .first()
        )
        if prev:
            prev_price = float(prev.unit_price)
            if price > prev_price * 1.005:
                trend = "up"
            elif price < prev_price * 0.995:
                trend = "down"
            else:
                trend = "stable"
        else:
            trend = "stable"

        # Always INSERT a new row (for historical trend queries)
        MarketPrice.objects.create(
            crop_name=commodity.capitalize(),
            market=market,
            unit_price=Decimal(str(round(price, 2))),
            unit="kg",
            price_trend=trend,
            source=source,
            category=KAMIS_FALLBACK.get(commodity.lower(), {}).get("category", category),
            recorded_at=timezone.now(),
        )

        # Also update the summary row (for quick lookups / existing API)
        MarketPrice.objects.filter(
            crop_name__iexact=commodity, market__iexact=market
        ).exclude(recorded_at=timezone.now()).update(price_trend=trend)

    except Exception as exc:
        logger.error("Failed to persist price for %s: %s", commodity, exc)

    try:
        cache.set(_redis_key(commodity, market), price, timeout=CACHE_TTL)
    except Exception as exc:
        logger.warning("Redis cache set failed: %s", exc)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class MarketDataService:
    """
    Fault-tolerant market price service.

    Resolution order:
      1. Redis cache
      2. UjuziKilimo external API
      3. KAMIS fallback
      4. DB latest cached row
      5. Structured error dict
    """

    def get_price(self, commodity: str, market: str = "Nairobi") -> dict:
        """
        Return a PriceRecord dict for the requested commodity+market.
        """
        commodity = commodity.strip().lower()
        market = market.strip()

        # 1. Redis cache hit -----------------------------------------------
        try:
            cached_price = cache.get(_redis_key(commodity, market))
            if cached_price is not None:
                logger.debug("Redis cache hit: %s @ %s", commodity, market)
                return self._build_record(
                    commodity, market, float(cached_price), "redis_cache", fallback=False
                )
        except Exception as exc:
            logger.warning("Redis cache get failed: %s", exc)

        # 2. UjuziKilimo primary API ------------------------------------------
        price = _fetch_from_ujuzikilimo(commodity, market)
        if price:
            _persist_price(commodity, market, price, "ujuzikilimo")
            return self._build_record(commodity, market, price, "ujuzikilimo", fallback=False)

        # 3. KAMIS fallback --------------------------------------------------
        price = _fetch_from_kamis(commodity)
        if price:
            _persist_price(commodity, market, price, "kamis_fallback")
            return self._build_record(commodity, market, price, "kamis_fallback", fallback=True)

        # 4. DB cached value -------------------------------------------------
        price = _fetch_from_db(commodity, market)
        if price:
            return self._build_record(commodity, market, price, "db_cache", fallback=True)

        # 5. No data ---------------------------------------------------------
        logger.error("All price sources exhausted for %s @ %s", commodity, market)
        return {
            "error": "Market data unavailable",
            "fallback_used": True,
            "commodity": commodity,
            "market": market,
        }

    def get_blended_price(self, commodity: str, market: str = "Nairobi") -> dict:
        """
        Blend external price (70%) with avg farmer listing price (30%).
        Falls back to pure external price if no farmer listings exist.
        """
        external = self.get_price(commodity, market)
        if "error" in external:
            return external

        ext_price = external["price"]
        farmer_avg = _get_avg_farmer_price(commodity)

        if farmer_avg and farmer_avg > 0:
            blended = round(0.70 * ext_price + 0.30 * farmer_avg, 2)
            return {
                **external,
                "price": blended,
                "external_price": ext_price,
                "farmer_avg_price": farmer_avg,
                "source": "blended",
                "blend_weights": {"external": 0.70, "farmer": 0.30},
            }

        return external

    def get_price_trend(self, commodity: str, market: str = "Nairobi", period_days: int = 7) -> dict:
        """
        Return historical price data and overall trend for chart display.
        """
        from smc_backend.apps.market.models import MarketPrice

        commodity = commodity.strip().lower()
        since = timezone.now() - timedelta(days=period_days)

        try:
            qs = (
                MarketPrice.objects
                .filter(
                    crop_name__iexact=commodity,
                    market__iexact=market,
                    recorded_at__gte=since,
                )
                .order_by("recorded_at")
                .values("recorded_at", "unit_price")
            )

            data: list[TrendPoint] = [
                {
                    "date": row["recorded_at"].strftime("%Y-%m-%d"),
                    "price": float(row["unit_price"]),
                }
                for row in qs
            ]

            # Fallback: fetch single current price if no history yet
            if not data:
                current = self.get_price(commodity, market)
                if "error" not in current:
                    today = timezone.now().strftime("%Y-%m-%d")
                    data = [{"date": today, "price": current["price"]}]

            # Determine trend from first → last
            trend = "stable"
            if len(data) >= 2:
                first, last = data[0]["price"], data[-1]["price"]
                if last > first * 1.02:
                    trend = "up"
                elif last < first * 0.98:
                    trend = "down"

            return {
                "commodity": commodity,
                "market": market,
                "period_days": period_days,
                "data": data,
                "trend": trend,
            }

        except Exception as exc:
            logger.error("Error fetching trend for %s: %s", commodity, exc)
            return {
                "error": "Trend data unavailable",
                "commodity": commodity,
                "market": market,
            }

    def bulk_refresh(self, commodities: list[str], markets: list[str] | None = None) -> dict:
        """
        Refresh prices for multiple commodity/market combinations.
        Used by the Celery beat task.
        Returns a summary dict.
        """
        if markets is None:
            markets = ["Nairobi"]

        results = {"updated": [], "failed": []}

        for commodity in commodities:
            for market in markets:
                try:
                    record = self.get_price(commodity, market)
                    if "error" in record:
                        results["failed"].append(f"{commodity}@{market}")
                    else:
                        results["updated"].append(
                            f"{commodity}@{market}={record['price']:.2f} ({record['source']})"
                        )
                except Exception as exc:
                    logger.error("bulk_refresh error %s@%s: %s", commodity, market, exc)
                    results["failed"].append(f"{commodity}@{market}")

        return results

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_record(
        commodity: str,
        market: str,
        price: float,
        source: str,
        fallback: bool,
    ) -> PriceRecord:
        return {
            "commodity": commodity,
            "market": market,
            "price": round(price, 2),
            "currency": "KES",
            "source": source,
            "timestamp": _now_iso(),
            "fallback_used": fallback,
        }


# Module-level singleton
market_data_service = MarketDataService()
