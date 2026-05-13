"""
Celery tasks for async operations.
"""

from django.utils import timezone
from datetime import timedelta
import requests
import json

from smc_backend.apps.analytics.models import FarmerAnalytics
from smc_backend.apps.credit.models import CreditScore
from smc_backend.apps.transactions.models import Transaction
from smc_backend.apps.market.models import MarketPrice
from smc_backend.apps.users.models import User
from smc_backend.utils.celery_compat import shared_task


@shared_task(bind=True, max_retries=3)
def fetch_market_prices(self):
    """
    Fetch market prices from external API (hourly).
    Mock implementation - replace with real API.
    """
    
    try:
        # Mock data - replace with real API call
        market_data = {
            'maize': {'price': 4500, 'trend': 'stable'},
            'tomatoes': {'price': 2800, 'trend': 'up'},
            'potatoes': {'price': 1200, 'trend': 'down'},
            'beans': {'price': 6500, 'trend': 'up'},
            'cabbage': {'price': 800, 'trend': 'stable'},
            'carrots': {'price': 1500, 'trend': 'up'},
        }
        
        for crop, data in market_data.items():
            price_obj, created = MarketPrice.objects.get_or_create(
                crop=crop,
                defaults={'price': data['price'], 'trend': data['trend']}
            )
            
            if not created:
                # Update existing price
                price_obj.price = data['price']
                price_obj.trend = data['trend']
                price_obj.save()
        
        return f"Updated {len(market_data)} market prices"
    
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def recalculate_credit_scores(self):
    """
    Recalculate credit scores for all farmers (daily).
    """
    
    try:
        from smc_backend.ml_models.credit_model import calculate_credit_score
        
        farmers = User.objects.filter(role='farmer')
        updated_count = 0
        
        for farmer in farmers:
            try:
                # Get or create analytics
                analytics, _ = FarmerAnalytics.objects.get_or_create(farmer=farmer)
                analytics.calculate_metrics()
                
                # Get transactions
                transactions = Transaction.objects.filter(user=farmer)
                
                # Calculate score
                score_data = calculate_credit_score(farmer, analytics, transactions)
                
                # Update or create credit score
                credit_score, _ = CreditScore.objects.get_or_create(farmer=farmer)
                credit_score.score = score_data['score']
                credit_score.risk_category = score_data['risk_category']
                credit_score.interest_rate = score_data['interest_rate']
                credit_score.recommended_credit_limit = score_data['recommended_credit_limit']
                credit_score.save()
                
                updated_count += 1
            
            except Exception as e:
                print(f"Error calculating score for {farmer.username}: {str(e)}")
                continue
        
        return f"Updated credit scores for {updated_count} farmers"
    
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def update_farmer_analytics(self):
    """
    Update analytics for all farmers (daily).
    """
    
    try:
        farmers = User.objects.filter(role='farmer')
        updated_count = 0
        
        for farmer in farmers:
            try:
                analytics, _ = FarmerAnalytics.objects.get_or_create(farmer=farmer)
                analytics.calculate_metrics()
                updated_count += 1
            except Exception as e:
                print(f"Error updating analytics for {farmer.username}: {str(e)}")
                continue
        
        return f"Updated analytics for {updated_count} farmers"
    
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def create_buyer_farmer_matches(self):
    """
    Create matches between buyers and farmers (daily).
    """
    
    try:
        from smc_backend.apps.geo.services import GeoMatchingService
        
        buyers = User.objects.filter(role='buyer', geo_location__isnull=False)
        total_matches = 0
        
        for buyer in buyers:
            try:
                count = GeoMatchingService.create_matches_for_buyer(buyer)
                total_matches += count
            except Exception as e:
                print(f"Error creating matches for {buyer.username}: {str(e)}")
                continue
        
        return f"Created {total_matches} buyer-farmer matches"
    
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def send_credit_application_notification(self, credit_request_id):
    """
    Send notification about credit application status.
    """
    
    try:
        from smc_backend.apps.credit.models import CreditRequest
        from django.core.mail import send_mail
        
        credit_request = CreditRequest.objects.get(id=credit_request_id)
        
        subject = f"Credit Application Status: {credit_request.status.upper()}"
        message = f"""
        Dear {credit_request.farmer.get_full_name()},
        
        Your credit application has been {credit_request.status}.
        
        Amount Requested: {credit_request.amount_requested}
        Status: {credit_request.status}
        
        Thank you for using Smart Market Connect.
        """
        
        send_mail(
            subject,
            message,
            'noreply@smartmarketconnect.com',
            [credit_request.farmer.email],
            fail_silently=False,
        )
        
        return f"Notification sent for credit request {credit_request_id}"
    
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def cleanup_expired_carts(self):
    """
    Remove carts that haven't been updated in 30 days.
    """
    
    try:
        from smc_backend.apps.cart.models import Cart
        
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        deleted_count, _ = Cart.objects.filter(
            updated_at__lt=thirty_days_ago
        ).delete()
        
        return f"Deleted {deleted_count} expired carts"
    
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def archive_old_conversations(self):
    """
    Archive conversations that haven't had activity in 60 days.
    """
    
    try:
        from smc_backend.apps.chat.models import Conversation
        
        sixty_days_ago = timezone.now() - timedelta(days=60)
        
        updated_count = Conversation.objects.filter(
            updated_at__lt=sixty_days_ago,
            is_active=True
        ).update(is_active=False)
        
        return f"Archived {updated_count} conversations"
    
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)
