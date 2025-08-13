# pyright: reportMissingImports=false
from celery import Celery

celery_app = Celery(
    "worker",
    broker="redis://queue:6379/0",
    backend="redis://queue:6379/1",
    beat_max_loop_interval=5,
)

celery_app.conf.task_routes = {"app.worker.*": "main-queue"}
