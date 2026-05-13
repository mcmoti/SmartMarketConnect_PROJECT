"""
Base Django settings for SMC project.
Shared settings for all environments.
"""

import os
from importlib.util import find_spec
from pathlib import Path
from datetime import timedelta
from decouple import config

# Build paths
BASE_DIR = Path(__file__).resolve().parents[3]
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-smc-change-me-in-production-xyz123')


def _module_available(module_name):
    return find_spec(module_name) is not None

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',

    # Local apps
    'smc_backend.apps.users',
    'smc_backend.apps.products',
    'smc_backend.apps.market',
    'smc_backend.apps.transactions',
    'smc_backend.apps.payments',
    'smc_backend.apps.credit',
    'smc_backend.apps.cart',
    'smc_backend.apps.chat',
    'smc_backend.apps.reviews',
    'smc_backend.apps.analytics',
    'smc_backend.apps.geo',
    'smc_backend.apps.ai_agent',
]

if _module_available('daphne'):
    INSTALLED_APPS.insert(0, 'daphne')

if _module_available('django_celery_beat'):
    INSTALLED_APPS.append('django_celery_beat')

if _module_available('django_celery_results'):
    INSTALLED_APPS.append('django_celery_results')

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'smc_backend.config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'smc_backend.config.wsgi.application'
ASGI_APPLICATION = 'smc_backend.config.asgi.application'

# Database configuration (will be overridden in settings files)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'smc'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', '4341'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# ============================================================================
# CHANNELS CONFIGURATION (WebSockets)
# ============================================================================

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

if _module_available('channels_redis'):
    CHANNEL_LAYERS['default'] = {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [(os.getenv('REDIS_HOST', 'localhost'), int(os.getenv('REDIS_PORT', 6379)))],
            'capacity': 1500,
            'expiry': 10,
        },
    }

# ============================================================================
# REST FRAMEWORK CONFIGURATION
# ============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    },
}

# ============================================================================
# JWT CONFIGURATION
# ============================================================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': os.getenv('SECRET_KEY', 'django-insecure-smc-change-me-in-production-xyz123'),
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JTI_CLAIM': 'jti',
    'TOKEN_TYPE_CLAIM': 'token_type',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ============================================================================
# CORS CONFIGURATION
# ============================================================================

CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173'
).split(',')

CORS_ALLOW_CREDENTIALS = True

# ============================================================================
# CELERY CONFIGURATION
# ============================================================================

CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = (
    'django-db' if _module_available('django_celery_results')
    else os.getenv('CELERY_RESULT_BACKEND', 'rpc://')
)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Nairobi'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
CELERY_RESULT_EXPIRES = 3600  # 1 hour

# Celery Beat Schedule
if _module_available('celery'):
    from celery.schedules import crontab

    CELERY_BEAT_SCHEDULE = {
        # Market prices: refresh every 30 minutes
        'fetch-market-prices-every-30-min': {
            'task': 'market.fetch_market_prices_realtime',
            'schedule': crontab(minute='0,30'),
        },
        # Backward-compat alias kept in case beat DB has old task name cached
        'fetch-market-prices-every-hour': {
            'task': 'smc_backend.apps.market.tasks.fetch_market_prices',
            'schedule': crontab(minute=0),
        },
        'recalculate-credit-scores-daily': {
            'task': 'smc_backend.config.celery_tasks.recalculate_credit_scores',
            'schedule': crontab(hour=2, minute=0),  # 2 AM daily
        },
        'update-ai-prediction-models-hourly': {
            'task': 'smc_backend.apps.ai_agent.tasks.update_ai_prediction_models',
            'schedule': crontab(minute=0), # Every hour
        },
    }
else:
    CELERY_BEAT_SCHEDULE = {}

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'smc.log',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'smc_backend': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# ============================================================================
# APPLICATION-SPECIFIC SETTINGS
# ============================================================================

# M-Pesa Configuration
MPESA_CONSUMER_KEY = config('MPESA_CONSUMER_KEY', default='')
MPESA_CONSUMER_SECRET = config('MPESA_CONSUMER_SECRET', default='')
MPESA_SHORTCODE = config('MPESA_SHORTCODE', default='174379')
MPESA_PASSKEY = config('MPESA_PASSKEY', default='')
MPESA_ENVIRONMENT = config('MPESA_ENVIRONMENT', default='sandbox')  # sandbox or production
MPESA_CALLBACK_URL = config('MPESA_CALLBACK_URL', default='https://your-domain.com/api/payments/mpesa/callback/')

# ============================================================================
# MARKET DATA SERVICE CONFIGURATION
# ============================================================================

# Primary: NextYield / Ujuzi Kilimo API
NEXTYIELD_BASE_URL = os.getenv('NEXTYIELD_BASE_URL', 'https://api.nextyield.ke/v1')
NEXTYIELD_API_KEY = os.getenv('NEXTYIELD_API_KEY', '')   # Set in .env — never commit!

# Fallback: KAMIS scrape / manual config
KAMIS_API_URL = os.getenv('KAMIS_API_URL', '')

# Cache TTL for Redis market price keys (seconds)
MARKET_PRICE_CACHE_TTL = int(os.getenv('MARKET_PRICE_CACHE_TTL', 1200))  # 20 min


# Firebase Configuration (optional)
FIREBASE_API_KEY = os.getenv('FIREBASE_API_KEY', '')

# ============================================================================
# SECURITY SETTINGS (will be enhanced in prod.py)
# ============================================================================

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================

EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'SMC Support <support@smc.com>')

# Trigger reload
