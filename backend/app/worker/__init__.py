# ruff: noqa: F401
from app.core.celery_app import celery_app

from .worker import example_task
