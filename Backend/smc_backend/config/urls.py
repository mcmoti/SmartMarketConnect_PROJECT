"""
URL routing for SMC backend API.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# Auth & User
from smc_backend.apps.users.views import (
    UserRegistrationView, UserLoginView, UserDetailView,
    StaffLogViewSet, ContactInquiryViewSet, MediaUploadView,
    PasswordResetRequestView, PasswordResetConfirmView, ChangePasswordView
)

# App ViewSets
from smc_backend.apps.products.views import ProductViewSet, BidViewSet, InventoryItemViewSet
from smc_backend.apps.cart.views import CartViewSet, CartItemViewSet
from smc_backend.apps.chat.views import ConversationViewSet, MessageViewSet
from smc_backend.apps.reviews.views import ReviewViewSet
from smc_backend.apps.market.views import (
    MarketPriceViewSet, LiveMarketPriceView, PriceTrendView, MarketCacheRefreshView, DashboardPricesView
)
from smc_backend.apps.transactions.views import TransactionViewSet, OrderViewSet, InvoiceViewSet, ReceiptViewSet
from smc_backend.apps.payments.views import MpesaSTKPushView, MpesaCallbackView
from smc_backend.apps.credit.views import CreditRequestViewSet, CreditScoreViewSet, CreditorProfileViewSet
from smc_backend.apps.analytics.views import AnalyticsViewSet
from smc_backend.apps.geo.views import BuyerPreferenceViewSet, BuyerFarmerMatchViewSet

# Initialize router
router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'inventory-items', InventoryItemViewSet, basename='inventory-item')
router.register(r'bids', BidViewSet, basename='bid')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'cart-items', CartItemViewSet, basename='cart-item')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'market-prices', MarketPriceViewSet, basename='market-price')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'receipts', ReceiptViewSet, basename='receipt')
router.register(r'credit-requests', CreditRequestViewSet, basename='credit-request')
router.register(r'credit-scores', CreditScoreViewSet, basename='credit-score')
router.register(r'creditors', CreditorProfileViewSet, basename='creditor')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')
router.register(r'staff-logs', StaffLogViewSet, basename='staff-log')
router.register(r'contact-inquiries', ContactInquiryViewSet, basename='contact-inquiry')
router.register(r'geo/preferences', BuyerPreferenceViewSet, basename='geo-preference')
router.register(r'geo/matches', BuyerFarmerMatchViewSet, basename='geo-match')

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # Authentication
    path('api/auth/register/', UserRegistrationView.as_view(), name='register'),
    path('api/auth/login/', UserLoginView.as_view(), name='login'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('api/auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('api/users/me/', UserDetailView.as_view(), name='user-detail'),
    path('api/uploads/', MediaUploadView.as_view(), name='media-upload'),

    # Payments (outside router — special endpoints)
    path('api/payments/mpesa/stk-push/', MpesaSTKPushView.as_view(), name='mpesa-stk-push'),
    path('api/payments/mpesa/callback/', MpesaCallbackView.as_view(), name='mpesa-callback'),

    # All router-registered endpoints under /api/
    path('api/', include(router.urls)),

    # Market data — live price, trend analysis, admin refresh
    path('api/market/live-price/', LiveMarketPriceView.as_view(), name='market-live-price'),
    path('api/market/dashboard-prices/', DashboardPricesView.as_view(), name='market-dashboard-prices'),
    path('api/market/price-trends/', PriceTrendView.as_view(), name='market-price-trends'),
    path('api/market/admin/refresh/', MarketCacheRefreshView.as_view(), name='market-admin-refresh'),

    # AI Agent
    path('api/ai/', include('smc_backend.apps.ai_agent.urls')),
]

# Media, static & debug toolbar in development
if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [
        path('__debug__/', include(debug_toolbar.urls)),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
