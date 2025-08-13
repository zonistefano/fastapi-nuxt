from fastapi import APIRouter

from app import models
from app.utilities import send_web_contact_email

router = APIRouter()


@router.post("/contact", status_code=201)
def send_email(*, data: models.EmailContent) -> models.Msg:
    """
    Standard app contact us.
    """
    send_web_contact_email(data=data)
    return models.Msg(
        msg="Web contact email sent",
    )
