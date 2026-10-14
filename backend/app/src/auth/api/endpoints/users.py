import logging
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi_myauth.email import send_email_validation_email
from fastapi_myauth.models import Msg
from fastapi_myauth.models.emails import EmailValidation
from fastapi_myauth.rate_limit import rate_limit
from fastapi_myauth.services import create_login_challenge

from ...models import CustomUser
from ...service import auth

router = APIRouter()
logger = logging.getLogger(__name__)
SessionDep = auth.deps.SessionDep
CurrentUser = Annotated[CustomUser, Depends(auth.deps.get_current_active_user)]


@router.post("/send-validation-email")
@rate_limit(limit=5, window_seconds=3600)
def send_validation_email(*, db: SessionDep, current_user: CurrentUser) -> Msg:
    """Send an email confirmation link for the authenticated account."""
    if current_user.email_validated:
        return Msg(msg="Email already confirmed.")
    if not auth.config.EMAILS_ENABLED:
        raise HTTPException(status_code=503, detail="Email delivery is unavailable.")
    tokens = create_login_challenge(
        db,
        user=current_user,
        config=auth.config,
        purpose="email_confirmation",
        expires_delta=timedelta(hours=auth.config.EMAIL_VALIDATION_TOKEN_EXPIRE_HOURS),
    )
    try:
        send_email_validation_email(
            EmailValidation(
                email=current_user.email, subject="Confirm your email", token=tokens[0]
            ),
            config=auth.config,
        )
    except (OSError, RuntimeError):
        logger.exception("Confirmation email delivery failed")
        raise HTTPException(status_code=503, detail="Email delivery is unavailable.")
    return Msg(msg="Confirmation email sent.")
