# pyright: reportMissingImports=false
from celery.utils.log import get_task_logger

from ..core.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task
def example_task():
    logger.info("Running scraper")
    return "Done"
