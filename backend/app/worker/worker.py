# pyright: reportMissingImports=false
from celery.utils.log import get_task_logger
from fastapi_myauth.maintenance import prune_expired
from sqlmodel import Session

from ..core.celery_app import celery_app
from ..core.db import engine

logger = get_task_logger(__name__)


@celery_app.task
def example_task() -> str:
    logger.info("Running example task")
    return "Done"


@celery_app.task
def prune_auth_records() -> dict[str, int]:
    """Remove expired refresh tokens, email challenges and passkey ceremonies."""
    with Session(engine) as session:
        return prune_expired(session)
