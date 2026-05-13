# SMC Backend - Production Configuration Guide

## Environment Variables

Create a `.env` file in the project root with these variables:

### Django Core
- `DEBUG`: Set to `False` for production
- `SECRET_KEY`: Generate a secure key (never share this)
- `ALLOWED_HOSTS`: Comma-separated list of allowed domain names
- `DJANGO_SETTINGS_MODULE`: `smc_backend.config.settings.prod`

### Database
- `DB_ENGINE`: `django.db.backends.postgresql`
- `DB_NAME`: Your PostgreSQL database name
- `DB_USER`: PostgreSQL username
- `DB_PASSWORD`: PostgreSQL password
- `DB_HOST`: Database hostname (e.g., localhost or RDS endpoint)
- `DB_PORT`: Database port (default: 5432)

### Redis (for Celery & WebSockets)
- `REDIS_HOST`: Redis server hostname
- `REDIS_PORT`: Redis port (default: 6379)
- `CELERY_BROKER_URL`: Full Redis URL (e.g., redis://localhost:6379/0)
- `CELERY_RESULT_BACKEND`: Full Redis URL

### JWT & Security
- `JWT_SECRET`: Secret key for JWT tokens
- `CORS_ALLOWED_ORIGINS`: Comma-separated frontend URLs

### M-Pesa Integration
- `MPESA_CONSUMER_KEY`: From Safaricom Daraja
- `MPESA_CONSUMER_SECRET`: From Safaricom Daraja
- `MPESA_SHORTCODE`: Your business shortcode
- `MPESA_PASSKEY`: Your M-Pesa passkey

### Email (for production notifications)
- `EMAIL_HOST`: SMTP server (e.g., smtp.gmail.com)
- `EMAIL_PORT`: SMTP port (usually 587)
- `EMAIL_HOST_USER`: Your email address
- `EMAIL_HOST_PASSWORD`: Your email password or app-specific password

### AWS S3 (optional, for media storage)
- `USE_S3`: Set to `True` to use S3
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_STORAGE_BUCKET_NAME`: S3 bucket name
- `AWS_S3_REGION_NAME`: AWS region

## Production Deployment Checklist

- [ ] Set `DEBUG = False` in settings
- [ ] Generate new `SECRET_KEY`
- [ ] Configure database (PostgreSQL)
- [ ] Setup Redis for Celery
- [ ] Configure HTTPS/SSL certificates
- [ ] Set correct ALLOWED_HOSTS
- [ ] Setup email backend
- [ ] Configure CORS for frontend domain
- [ ] Run migrations: `python manage.py migrate`
- [ ] Collect static files: `python manage.py collectstatic --noinput`
- [ ] Create admin superuser: `python manage.py createsuperuser`
- [ ] Setup monitoring and logging
- [ ] Configure backup strategy for database
- [ ] Setup health checks

## Running on Production

### Using Gunicorn + Systemd

Create `/etc/systemd/system/smc-backend.service`:
```ini
[Unit]
Description=SMC Backend Gunicorn Application
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/smc-backend
ExecStart=/var/www/smc-backend/venv/bin/gunicorn \
    --workers 4 \
    --worker-class sync \
    --bind unix:/var/www/smc-backend/gunicorn.sock \
    --access-logfile /var/log/smc-backend/access.log \
    --error-logfile /var/log/smc-backend/error.log \
    smc_backend.config.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl start smc-backend
sudo systemctl enable smc-backend
```

### Using Celery + Systemd

Create `/etc/systemd/system/smc-celery.service`:
```ini
[Unit]
Description=SMC Celery Worker
After=network.target

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/var/www/smc-backend
ExecStart=/var/www/smc-backend/venv/bin/celery -A smc_backend worker -l info --logfile=/var/log/smc-backend/celery.log
Restart=always

[Install]
WantedBy=multi-user.target
```

### Nginx Configuration

```nginx
upstream smc_backend {
    server unix:/var/www/smc-backend/gunicorn.sock fail_timeout=0;
}

server {
    listen 80;
    server_name api.smartmarketconnect.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.smartmarketconnect.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.smartmarketconnect.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.smartmarketconnect.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 10M;

    location /static/ {
        alias /var/www/smc-backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /var/www/smc-backend/media/;
        expires 7d;
    }

    location / {
        proxy_pass http://smc_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create necessary directories
RUN mkdir -p logs staticfiles media

# Collect static files
RUN python manage.py collectstatic --noinput || true

CMD ["gunicorn", "smc_backend.config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

### docker-compose.yml
```yaml
version: '3.9'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  web:
    build: .
    command: gunicorn smc_backend.config.wsgi:application --bind 0.0.0.0:8000 --workers 4
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - DJANGO_SETTINGS_MODULE=smc_backend.config.settings.prod
    depends_on:
      - db
      - redis
    volumes:
      - ./media:/app/media
      - ./logs:/app/logs

  celery:
    build: .
    command: celery -A smc_backend worker -l info
    environment:
      - DEBUG=False
      - DJANGO_SETTINGS_MODULE=smc_backend.config.settings.prod
    depends_on:
      - db
      - redis

  celery-beat:
    build: .
    command: celery -A smc_backend beat -l info
    environment:
      - DEBUG=False
      - DJANGO_SETTINGS_MODULE=smc_backend.config.settings.prod
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py createsuperuser
```

## Monitoring & Logging

### Setup Sentry for Error Tracking
1. Create Sentry account at sentry.io
2. Install: `pip install sentry-sdk`
3. Add to settings:
```python
import sentry_sdk
sentry_sdk.init(
    dsn="your-sentry-dsn",
    traces_sample_rate=0.1
)
```

### Database Backups
```bash
# Daily backup script
pg_dump -U $DB_USER -h $DB_HOST $DB_NAME | gzip > backups/smc_db_$(date +%Y%m%d).sql.gz

# Schedule with crontab
0 2 * * * /home/user/backup_db.sh
```

## Performance Optimization

1. **Database Indexing**: Already configured in models
2. **Caching**: Use Redis for frequent queries
3. **Pagination**: API responses are paginated (20 items per page)
4. **Query Optimization**: Use select_related() and prefetch_related()
5. **Gzip Compression**: Enable in Nginx/Gunicorn
6. **CDN**: Use CloudFront/CloudFlare for static assets

## Troubleshooting

### Port already in use
```bash
# Find and kill process using port 8000
lsof -ti:8000 | xargs kill -9
```

### Database connection errors
- Check PostgreSQL is running
- Verify connection credentials
- Check firewall rules

### Celery not working
- Verify Redis is running
- Check CELERY_BROKER_URL in .env
- View worker logs: `celery -A smc_backend worker -l debug`

### Static files not loading
```bash
python manage.py collectstatic --noinput
python manage.py compress
```
