"""
Market price views.

Endpoints
---------
GET /api/market-prices/                       — paginated DB table (existing)
GET /api/market/live-price/                   — live price with full fallback chain
GET /api/market/live-price/?blended=true      — blended (external 70% + farmer 30%)
GET /api/market/price-trends/                 — historical chart data
POST /api/market/admin/refresh/               — manual cache refresh (admin only)
"""

import logging
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import MarketPrice
from .serializers import MarketPriceSerializer, LivePriceSerializer, PriceTrendSerializer
from .services.market_data_service import market_data_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Existing read-only ViewSet (backward-compatible)
# ---------------------------------------------------------------------------

class MarketPriceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Paginated read-only access to stored market price records.
    All authenticated users can view prices.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MarketPriceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "price_trend", "market"]
    search_fields = ["crop_name", "category", "market"]
    ordering_fields = ["unit_price", "recorded_at", "updated_at"]
    ordering = ["-recorded_at"]

    def get_queryset(self):
        """
        Return the most recent price per (crop_name, market) pair by default,
        unless ?history=true is passed for the full time-series.
        """
        qs = MarketPrice.objects.all()
        if self.request.query_params.get("history") != "true":
            # Fetch only latest per commodity+market
            from django.db.models import Max, OuterRef, Subquery
            latest_ids = (
                MarketPrice.objects
                .values("crop_name", "market")
                .annotate(max_id=Max("id"))
                .values("max_id")
            )
            qs = MarketPrice.objects.filter(pk__in=latest_ids)
        return qs


# ---------------------------------------------------------------------------
# Live price endpoint
# ---------------------------------------------------------------------------

class LiveMarketPriceView(APIView):
    """
    GET /api/market/live-price/?commodity=maize&market=Nairobi

    Query params:
      commodity   (required)  crop name, e.g. "maize"
      market      (optional)  market location, default "Nairobi"
      blended     (optional)  "true" to use farmer listing blend
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        commodity = request.query_params.get("commodity", "").strip()
        if not commodity:
            return Response(
                {"error": "Query param 'commodity' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        market = request.query_params.get("market", "Nairobi").strip()
        use_blended = request.query_params.get("blended", "false").lower() == "true"

        if use_blended:
            result = market_data_service.get_blended_price(commodity, market)
        else:
            result = market_data_service.get_price(commodity, market)

        if "error" in result:
            return Response(result, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(result, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Price trend endpoint
# ---------------------------------------------------------------------------

class PriceTrendView(APIView):
    """
    GET /api/market/price-trends/?commodity=maize&market=Nairobi&period=7d

    Query params:
      commodity   (required)
      market      (optional, default "Nairobi")
      period      (optional, default "7d") — format: Nd where N is days
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        commodity = request.query_params.get("commodity", "").strip()
        if not commodity:
            return Response(
                {"error": "Query param 'commodity' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        market = request.query_params.get("market", "Nairobi").strip()
        period_str = request.query_params.get("period", "7d").lower().strip()

        # Parse period: "7d" -> 7, "30d" -> 30 (cap at 365)
        try:
            period_days = int(period_str.replace("d", ""))
            period_days = max(1, min(period_days, 365))
        except ValueError:
            return Response(
                {"error": "Invalid 'period' format. Use e.g. '7d', '30d'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = market_data_service.get_price_trend(commodity, market, period_days)

        if "error" in result:
            return Response(result, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(result, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Dashboard Prices endpoint (Multiple products, Categorized)
# ---------------------------------------------------------------------------

class DashboardPricesView(APIView):
    """
    GET /api/market/dashboard-prices/
    Returns a categorized list of live prices for a variety of products.
    Prioritizes farmer's inventory.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        farmer_crops = []
        if user.is_farmer():
            try:
                from smc_backend.apps.products.models import InventoryItem
                farmer_crops = list(InventoryItem.objects.filter(farmer=user).values_list('crop', flat=True).distinct())
            except Exception:
                pass

        base_products = [
            "maize", "beans", "rice", "potatoes", "tomatoes", "onions", "cabbage",
            "carrots", "wheat", "kales", "coffee", "tea", "avocado", "mangoes", "bananas"
        ]

        products_to_fetch = []
        for c in farmer_crops:
            if c.lower() not in products_to_fetch:
                products_to_fetch.append(c.lower())
        
        for p in base_products:
            if len(products_to_fetch) >= 15:
                break
            if p not in products_to_fetch:
                products_to_fetch.append(p)

        market = request.query_params.get("market", "Nairobi").strip()
        from django.utils import timezone
        from .services.market_data_service import KAMIS_FALLBACK

        results = []
        for commodity in products_to_fetch:
            res = market_data_service.get_price(commodity, market)
            category = KAMIS_FALLBACK.get(commodity, {}).get("category", "general")
            
            if "error" not in res:
                res["category"] = category
                results.append(res)
            else:
                # Provide a dev fallback even if missing entirely
                results.append({
                    "commodity": commodity,
                    "market": market,
                    "price": KAMIS_FALLBACK.get(commodity, {}).get("price", 50.0),
                    "currency": "KES",
                    "source": "fallback_mock",
                    "timestamp": timezone.now().isoformat(),
                    "fallback_used": True,
                    "category": category
                })

        return Response(results, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Admin cache refresh endpoint
# ---------------------------------------------------------------------------

class MarketCacheRefreshView(APIView):
    """
    POST /api/market/admin/refresh/

    Body (optional):
      {
        "commodities": ["maize", "beans"],
        "markets": ["Nairobi", "Mombasa"]
      }

    Requires staff/admin status.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        commodities = request.data.get(
            "commodities",
            ["maize", "beans", "rice", "potatoes", "tomatoes", "onions", "wheat"],
        )
        markets = request.data.get("markets", ["Nairobi"])

        if not isinstance(commodities, list) or not isinstance(markets, list):
            return Response(
                {"error": "'commodities' and 'markets' must be lists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = market_data_service.bulk_refresh(commodities, markets)
        return Response(
            {
                "message": "Cache refresh complete.",
                "updated_count": len(results["updated"]),
                "failed_count": len(results["failed"]),
                "details": results,
            },
            status=status.HTTP_200_OK,
        )
