# pyright: reportMissingImports=false
from celery import Celery

from .config import settings

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    beat_max_loop_interval=5,
)

celery_app.conf.task_routes = {"app.worker.*": "main-queue"}
celery_app.conf.beat_schedule = {
    "prune-expired-auth-records": {
        "task": "app.worker.worker.prune_auth_records",
        "schedule": 3600.0,
    },
}
