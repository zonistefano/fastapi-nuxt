from fastapi_myauth.config import Settings as BaseAuthSettings
from pydantic import EmailStr, Field
from pydantic_settings import BaseSettings


class AuthSettings(BaseAuthSettings, BaseSettings):
    """Load the library's settings from the environment with persistent keys."""

    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str = Field(min_length=8, max_length=64)
    SECRET_KEY: str = Field(min_length=32)
    TOTP_SECRET_KEY: str
    SERVER_BOT: str = "Assistant"


auth_settings = AuthSettings()  # type: ignore[call-arg]
