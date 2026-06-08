from fastapi import APIRouter
from fastapi_myauth import models
from fastapi_myauth.email import send_web_contact_email

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
