"""
Celery tasks for market data fetching.

Tasks
-----
fetch_market_prices_realtime   — every 30 min (beat schedule)
fetch_commodity_price_task     — on-demand single commodity fetch
"""

import logging
from smc_backend.utils.celery_compat import shared_task

logger = logging.getLogger(__name__)

# Commodities and markets refreshed every 30 minutes
TRACKED_COMMODITIES = [
    "maize", "beans", "rice", "potatoes",
    "tomatoes", "onions", "wheat", "kales", "cabbage",
]
TRACKED_MARKETS = ["Nairobi", "Mombasa", "Kisumu", "Nakuru"]


@shared_task(bind=True, max_retries=3, name="market.fetch_market_prices_realtime")
def fetch_market_prices_realtime(self):
    """
    Primary scheduled task — runs every 30 minutes.
    Refreshes prices for all tracked commodity/market combinations.
    Falls back gracefully through KAMIS → DB cache → error log.
    """
    from smc_backend.apps.market.services.market_data_service import market_data_service

    try:
        logger.info(
            "Starting market price refresh: %d commodities × %d markets",
            len(TRACKED_COMMODITIES),
            len(TRACKED_MARKETS),
        )
        results = market_data_service.bulk_refresh(TRACKED_COMMODITIES, TRACKED_MARKETS)
        summary = (
            f"Market refresh done — "
            f"{len(results['updated'])} updated, "
            f"{len(results['failed'])} failed."
        )
        logger.info(summary)
        return summary

    except Exception as exc:
        logger.error("fetch_market_prices_realtime failed: %s", exc)
        raise self.retry(exc=exc, countdown=120)


@shared_task(bind=True, max_retries=3, name="market.fetch_commodity_price_task")
def fetch_commodity_price_task(self, commodity: str, market: str = "Nairobi"):
    """
    On-demand task to fetch a single commodity price.
    Can be triggered from the admin refresh endpoint or other services.
    """
    from smc_backend.apps.market.services.market_data_service import market_data_service

    try:
        result = market_data_service.get_price(commodity, market)
        if "error" in result:
            logger.warning(
                "fetch_commodity_price_task: no price for %s@%s — %s",
                commodity, market, result["error"],
            )
            return result
        logger.info(
            "Fetched %s@%s = %.2f KES (source: %s)",
            commodity, market, result["price"], result["source"],
        )
        return result

    except Exception as exc:
        logger.error("fetch_commodity_price_task error: %s", exc)
        raise self.retry(exc=exc, countdown=60)


# Keep the original task name for beat schedule backward-compatibility
@shared_task(name="smc_backend.apps.market.tasks.fetch_market_prices")
def fetch_market_prices():
    """
    Alias kept for Celery Beat backward-compatibility.
    Delegates to the real-time fetch task.
    """
    return fetch_market_prices_realtime.apply_async()
