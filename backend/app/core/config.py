import secrets
from typing import Literal

from pydantic import (
    AnyHttpUrl,
    EmailStr,
    PostgresDsn,
    field_validator,
)
from pydantic_core.core_schema import FieldValidationInfo
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    TOTP_SECRET_KEY: str = secrets.token_urlsafe(32)
    # 60 seconds * 30 minutes = 30 minutes
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 60 * 30
    # 60 seconds * 60 minutes * 24 hours * 30 days = 30 days
    REFRESH_TOKEN_EXPIRE_SECONDS: int = 60 * 60 * 24 * 30
    JWT_ALGO: str = "HS512"
    TOTP_ALGO: Literal["sha1", "sha256", "sha512"] = "sha1"
    FRONTEND_HOST: str
    FRONTEND_URL: AnyHttpUrl
    SERVER_BOT: str = "Symona"
    BACKEND_CORS_ORIGINS: list[str]
    ENABLE_DOCS: bool = True

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str] | str:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list | str):
            return v
        raise ValueError(v)

    PROJECT_NAME: str

    # GENERAL SETTINGS

    MULTI_MAX: int = (
        20  # Maximum number of items returned in a page for CRUD operations
    )

    # COMPONENT SETTINGS

    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    SQLALCHEMY_DATABASE_URI: str | None = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None, values: FieldValidationInfo) -> str:
        if isinstance(v, str):
            return v
        return str(
            PostgresDsn.build(  # pyright: ignore
                scheme="postgresql",
                username=values.data.get("POSTGRES_USER"),
                password=values.data.get("POSTGRES_PASSWORD"),
                host=values.data.get("POSTGRES_SERVER"),
                path=f"{values.data.get('POSTGRES_DB') or ''}",
            )
        )

    SMTP_TLS: bool = True
    SMTP_PORT: int | None = None
    SMTP_HOST: str | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAILS_FROM_EMAIL: EmailStr | None = None
    EMAILS_FROM_NAME: str | None = None
    EMAILS_TO_EMAIL: EmailStr

    @field_validator("EMAILS_FROM_NAME")
    @classmethod
    def get_project_name(cls, v: str | None, values: FieldValidationInfo) -> str:
        if not v:
            return values.data["PROJECT_NAME"]
        return v

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48
    EMAIL_TEMPLATES_DIR: str = "/app/app/email-templates/build"
    EMAILS_ENABLED: bool = False

    @field_validator("EMAILS_ENABLED", mode="before")
    @classmethod
    def get_emails_enabled(cls, v: bool, values: FieldValidationInfo) -> bool:
        return bool(
            values.data.get("SMTP_HOST")
            and values.data.get("SMTP_PORT")
            and values.data.get("EMAILS_FROM_EMAIL")
        )

    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str
    USERS_OPEN_REGISTRATION: bool = True
    EMAIL_TEST_USER: EmailStr = "test@example.com"


settings = Settings()  # pyright: ignore
