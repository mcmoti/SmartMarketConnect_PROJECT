"""
Celery app initialization for SMC project.
"""

import os

try:
    from celery import Celery
except ImportError:
    Celery = None

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smc_backend.config.settings.dev')

if Celery is not None:
    app = Celery('smc_backend')

    # Load configuration from Django settings
    app.config_from_object('django.conf:settings', namespace='CELERY')

    # Auto-discover tasks from all registered Django apps
    app.autodiscover_tasks()
else:
    class _CeleryStub:
        def task(self, *args, **kwargs):
            def decorator(func):
                return func

            return decorator

        def autodiscover_tasks(self):
            return None

    app = _CeleryStub()

@app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery."""
    print(f'Request: {self.request!r}')
