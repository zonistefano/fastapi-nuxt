import logging

from fastapi import APIRouter, HTTPException
from fastapi_myauth import models
from fastapi_myauth.email import send_web_contact_email
from fastapi_myauth.rate_limit import rate_limit

from ...service import auth

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/contact", status_code=201)
@rate_limit(limit=5, window_seconds=3600)
def send_email(*, data: models.EmailContent) -> models.Msg:
    """
    Standard app contact us.
    """
    if not auth.config.EMAILS_ENABLED:
        raise HTTPException(status_code=503, detail="Email delivery is unavailable.")
    try:
        send_web_contact_email(data=data, config=auth.config)
    except (OSError, RuntimeError):
        logger.exception("Contact email delivery failed")
        raise HTTPException(status_code=503, detail="Email delivery is unavailable.")
    return models.Msg(
        msg="Web contact email sent",
    )
