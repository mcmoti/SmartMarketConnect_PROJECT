from django.urls import path
from .views import PredictPriceView, MarketInsightsView, CreditScorePredictionView

urlpatterns = [
    path('predict-price/', PredictPriceView.as_view(), name='ai-predict-price'),
    path('market-insights/', MarketInsightsView.as_view(), name='ai-market-insights'),
    path('credit-score/', CreditScorePredictionView.as_view(), name='ai-credit-score'),
]
