import secrets

from cryptography.fernet import Fernet
from pydantic import (
    AnyHttpUrl,
    EmailStr,
)
from pydantic_settings import BaseSettings


class AuthSettings(BaseSettings):
    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str
    SECRET_KEY: str = secrets.token_urlsafe(32)
    TOTP_SECRET_KEY: str = Fernet.generate_key().decode()
    # 60 seconds * 30 minutes = 30 minutes
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 60 * 30
    # 60 seconds * 60 minutes * 24 hours * 30 days = 30 days
    REFRESH_TOKEN_EXPIRE_SECONDS: int = 60 * 60 * 24 * 30
    JWT_ALGO: str = "HS512"
    FRONTEND_HOST: str = "localhost"
    FRONTEND_URL: AnyHttpUrl = AnyHttpUrl("http://localhost:3000")
    SERVER_BOT: str = "Symona"
    PROJECT_NAME: str = "FastAPI Auth"

    # GENERAL SETTINGS

    MULTI_MAX: int = (
        20  # Maximum number of items returned in a page for CRUD operations
    )

    SMTP_TLS: bool = True
    SMTP_PORT: int | None = None
    SMTP_HOST: str | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAILS_FROM_EMAIL: EmailStr | None = None
    EMAILS_FROM_NAME: str | None = None
    EMAILS_TO_EMAIL: EmailStr = "a@a.com"

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48
    EMAIL_VALIDATION_TOKEN_EXPIRE_HOURS: int = 48
    EMAIL_TEMPLATES_DIR: str = "/app/app/email-templates/build"
    REQUIRE_EMAIL_VALIDATION: bool = True


auth_settings = AuthSettings()  # type: ignore
