import logging
from celery import shared_task
from django.core.cache import cache

logger = logging.getLogger(__name__)

@shared_task
def update_ai_prediction_models():
    """
    Periodic task to clear market prediction caches to simulate updating models and fetching fresh data.
    """
    logger.info("Executing Celery Task: update_ai_prediction_models")
    # In a real scenario, this would retrain the model or fetch external updates.
    # Here, we just clear keys matching our pattern to force the sophisticated mock to run again.
    
    # Simple method: clear all. In production, we'd use `cache.delete_pattern("price_prediction_*")` if using Redis
    try:
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern("price_prediction_*")
        else:
            cache.clear()
        logger.info("AI Prediction models updated (cache cleared).")
        return "Success"
    except Exception as e:
        logger.error(f"Error updating models: {e}")
        return str(e)
