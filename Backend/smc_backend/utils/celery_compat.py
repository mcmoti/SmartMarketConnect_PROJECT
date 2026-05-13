"""
Compatibility helpers for environments where Celery is optional.
"""

try:
    from celery import shared_task  # type: ignore
except ImportError:
    def shared_task(*decorator_args, **decorator_kwargs):
        """
        Provide a no-op Celery decorator so Django can import task modules
        even when Celery is not installed in the active environment.
        """

        if decorator_args and callable(decorator_args[0]) and len(decorator_args) == 1 and not decorator_kwargs:
            return decorator_args[0]

        def decorator(func):
            return func

        return decorator
