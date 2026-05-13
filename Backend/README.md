# Smart Market Connect (SMC) Backend

A production-ready Django REST API backend for an agri-tech platform enabling smallholder farmers in Kenya to access market prices, sell produce, manage credit, and conduct transactions.

## 🎯 Features

### User Management
- Custom User model with role-based access (farmer, buyer, creditor)
- JWT authentication with token refresh
- User profile management with phone number validation
- Account verification system

### Product Management
- Farmers can list produce with images, pricing, and availability
- Real-time product search and filtering by category, location
- Product availability tracking
- Status management (active, sold_out, archived)

### Buyer Shopping System
- Shopping cart with add/remove/update operations
- Cart persistence per buyer
- Real-time inventory checks
- Order summary and total price calculation

### Bidding System
- Buyers can place bids on products
- Farmers can accept/reject bids
- Automatic transaction creation on bid acceptance
- Bid history and status tracking

### Real-Time Chat
- One-to-one messaging between buyers and farmers
- WebSocket support via Django Channels
- Message read status tracking
- Conversation history and management

### Market Prices
- Real-time crop price tracking
- Price trend analysis (up/down/stable)
- Celery periodic task for price updates
- Search and filter by crop/category

### Product Reviews & Ratings
- Verified purchase reviews (1-5 stars)
- Quality feedback on products
- Prevents duplicate reviews per transaction
- Review aggregation and statistics

### Payment Integration
- M-Pesa STK Push integration (mock implementation ready for real API)
- Transaction tracking with status management
- Payment callbacks and webhooks
- Transaction history per user

### Credit System with Scoring
- **Deterministic Credit Scoring Model** based on:
  - Cashflow Reliability (40%): Transaction frequency and success rate
  - Consistency (30%): Regularity of listings and platform activity
  - Proof of Sale/Collateral (30%): Volume and history of completed trades
- Score range: 0-100 with risk levels (low/medium/high)
- Dynamic interest rates based on risk assessment
- Recommended credit amounts based on transaction history
- Creditor approval workflow

### Async Task Processing
- Celery task queue with Redis
- Scheduled market price fetching (hourly)
- Email notifications
- Background job processing

### Security Features
- CSRF protection
- SQL injection prevention via ORM
- Input validation and serialization
- Role-based permissions
- CORS configuration
- JWT token expiration and refresh

## 🛠️ Tech Stack

- **Framework**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL
- **Authentication**: JWT (SimpleJWT)
- **Real-Time**: Django Channels with WebSockets
- **Task Queue**: Celery + Redis
- **Payments**: M-Pesa Daraja API (mock/live)
- **Image Processing**: Pillow
- **Environment**: django-environ

## 📋 Requirements

- Python 3.9+
- PostgreSQL 12+
- Redis 6.0+
- pip/poetry

## 🚀 Setup Instructions

### 1. Clone and Navigate
```bash
cd Backend
```

### 2. Create Virtual Environment
```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
```bash
# Copy example to actual .env file
cp .env.example .env

# Edit .env with your values
nano .env
```

Key environment variables:
- `DJANGO_SETTINGS_MODULE`: Set to `smc_backend.config.settings.dev` (dev) or `smc_backend.config.settings.prod` (production)
- `SECRET_KEY`: Generate with `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`
- Database credentials
- Redis connection
- CORS origins

### 5. Setup PostgreSQL Database
```bash
# Create database and user
createdb smc_db
createuser smc_user -P
# (Set password to 'postgres' for dev or secure password for prod)
```

### 6. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Create Superuser
```bash
python manage.py createsuperuser
```

### 8. Load Initial Data (Optional)
```bash
python manage.py shell
>>> from smc_backend.apps.market.tasks import fetch_market_prices
>>> fetch_market_prices()
```

### 9. Start Development Server
```bash
# Terminal 1: Django development server
python manage.py runserver

# Terminal 2: Celery worker
celery -A smc_backend worker -l info

# Terminal 3: Celery Beat (scheduler)
celery -A smc_backend beat -l info
```

The API will be available at `http://localhost:8000/api/`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login and get tokens
- `POST /api/auth/token/refresh/` - Refresh access token
- `GET /api/users/me/` - Get current user profile

### Products
- `GET /api/products/` - List all active products
- `POST /api/products/` - Create product (farmer only)
- `GET /api/products/{id}/` - Get product details
- `PATCH /api/products/{id}/` - Update product (farmer only)
- `DELETE /api/products/{id}/` - Delete product (farmer only)
- `POST /api/products/{id}/mark_sold_out/` - Mark as sold out
- `GET /api/products/{id}/bids/` - Get product bids (farmer only)

### Bids
- `GET /api/bids/` - List bids
- `POST /api/bids/` - Place bid (buyer only)
- `PATCH /api/bids/{id}/accept/` - Accept bid (farmer only)
- `PATCH /api/bids/{id}/reject/` - Reject bid (farmer only)

### Cart
- `GET /api/cart/` - Get current cart
- `POST /api/cart/add_item/` - Add item to cart
- `POST /api/cart/remove_item/` - Remove item from cart
- `POST /api/cart/clear/` - Clear cart
- `GET /api/cart-items/` - List cart items
- `PATCH /api/cart-items/{product_id}/` - Update item quantity

### Chat
- `GET /api/conversations/` - List conversations
- `POST /api/conversations/start/` - Start new conversation
- `GET /api/conversations/{id}/` - Get conversation details
- `GET /api/messages/?conversation_id={id}` - List messages
- `POST /api/messages/` - Send message
- `POST /api/messages/mark_as_read/` - Mark as read

### Reviews
- `GET /api/reviews/` - List reviews
- `POST /api/reviews/` - Create review (buyer only)
- `GET /api/reviews/product_reviews/?product_id={id}` - Get product reviews
- `GET /api/reviews/my_reviews/` - Get my reviews

### Market Prices
- `GET /api/market-prices/` - List market prices
- `GET /api/market-prices/{id}/` - Get price details

### Transactions
- `GET /api/transactions/` - List user transactions

### Payments
- `POST /api/payments/mpesa/stk-push/` - Initiate M-Pesa payment
- `POST /api/payments/mpesa/callback/` - M-Pesa callback (webhook)

### Credit
- `GET /api/credit-scores/` - View credit score
- `POST /api/credit-scores/recalculate/` - Recalculate score
- `GET /api/credit-requests/` - List credit requests
- `POST /api/credit-requests/` - Request credit (farmer only)
- `POST /api/credit-requests/{id}/approve/` - Approve request (creditor only)
- `POST /api/credit-requests/{id}/reject/` - Reject request (creditor only)

## 🧪 Testing Endpoints

### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "farmer1",
    "email": "farmer1@example.com",
    "password": "secure123",
    "password_confirm": "secure123",
    "phone_number": "254712345678",
    "role": "farmer"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "farmer1",
    "password": "secure123"
  }'
```

### Create Product
```bash
curl -X POST http://localhost:8000/api/products/ \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fresh Tomatoes",
    "category": "vegetables",
    "quantity": 100,
    "unit": "kg",
    "price": 1200,
    "location": "Nakuru, Kenya",
    "description": "High-quality fresh tomatoes"
  }'
```

## 📊 Database Models

### Users
- Custom User model with role field
- Phone number unique constraint
- Profile image and bio

### Products
- Farmer listings with images
- Quantity and unit tracking
- Status management

### Bids
- One bid per buyer per product
- Automatic total calculation

### Cart & CartItems
- One active cart per buyer
- Product quantity tracking

### Chat
- Conversations between users
- Messages with read status

### Reviews
- One review per product per transaction
- Rating and comment fields

### Transactions
- All payment/order tracking
- Multiple transaction types
- M-Pesa reference storage

### CreditScore & CreditRequest
- Deterministic scoring algorithm
- Credit request workflow
- Risk assessment

## 🏭 Production Deployment

### Using Gunicorn
```bash
gunicorn smc_backend.config.wsgi:application \
  --workers 4 \
  --worker-class sync \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### Using Nginx (Reverse Proxy)
```nginx
upstream smc_backend {
    server localhost:8000;
}

server {
    listen 80;
    server_name api.smartmarketconnect.com;

    location / {
        proxy_pass http://smc_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Docker Deployment
Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "smc_backend.config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

## 📝 Project Structure

```
smc_backend/
├── config/
│   ├── settings/
│   │   ├── base.py          # Shared settings
│   │   ├── dev.py           # Development settings
│   │   └── prod.py          # Production settings
│   ├── asgi.py              # WebSocket support
│   ├── wsgi.py              # WSGI application
│   ├── celery.py            # Celery config
│   └── urls.py              # Main URL routing
├── apps/
│   ├── users/               # Authentication & profiles
│   ├── products/            # Products & bidding
│   ├── cart/                # Shopping cart
│   ├── chat/                # Real-time messaging
│   ├── reviews/             # Product reviews
│   ├── market/              # Market prices
│   ├── transactions/        # Payment tracking
│   ├── payments/            # M-Pesa integration
│   └── credit/              # Credit scoring & requests
├── services/                # Business logic
└── utils/                   # Utilities
```

## 🔒 Security Notes

1. **Secrets Management**: Never commit `.env` files. Use environment variables in production
2. **HTTPS**: Always use HTTPS in production
3. **Database**: Use strong passwords for PostgreSQL
4. **CORS**: Whitelist only trusted origins
5. **Rate Limiting**: Consider adding DRF throttling
6. **SQL Injection**: Using Django ORM protects against this
7. **CSRF**: Django middleware handles CSRF tokens

## 📞 Support & Contribution

For issues, feature requests, or contributions, please contact the development team.

## 📄 License

Proprietary - Smart Market Connect Platform
