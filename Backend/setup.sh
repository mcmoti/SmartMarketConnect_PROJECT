#!/bin/bash
# Django settings module
export DJANGO_SETTINGS_MODULE=smc_backend.config.settings.dev

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Load market data (optional)
python manage.py shell << END
from smc_backend.apps.market.tasks import fetch_market_prices
fetch_market_prices()
END

# Start development server
python manage.py runserver
