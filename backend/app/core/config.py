import json
from typing import Annotated, Self

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode
from sqlalchemy import URL


class Settings(BaseSettings):
    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = []
    ENABLE_DOCS: bool = True
    PROJECT_NAME: str
    MULTI_MAX: int = Field(default=20, gt=0)
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REDIS_URL: str | None = None
    CELERY_BROKER_URL: str = "redis://queue:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://queue:6379/1"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            value = (
                json.loads(value)
                if value.lstrip().startswith("[")
                else value.split(",")
            )
        if not isinstance(value, list) or any(
            not isinstance(origin, str) for origin in value
        ):
            raise ValueError("CORS origins must be a list of strings.")
        origins = [origin.strip().rstrip("/") for origin in value if origin.strip()]
        if "*" in origins:
            raise ValueError("Credentialed CORS requires explicit origins.")
        return origins

    POSTGRES_SERVER: str
    POSTGRES_PORT: int = Field(default=5432, ge=1, le=65535)
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    SQLALCHEMY_DATABASE_URI: str | None = None

    @model_validator(mode="after")
    def assemble_db_connection(self) -> Self:
        if not self.SQLALCHEMY_DATABASE_URI:
            self.SQLALCHEMY_DATABASE_URI = URL.create(
                "postgresql+psycopg",
                username=self.POSTGRES_USER,
                password=self.POSTGRES_PASSWORD,
                host=self.POSTGRES_SERVER,
                port=self.POSTGRES_PORT,
                database=self.POSTGRES_DB,
            ).render_as_string(hide_password=False)
        return self


settings = Settings()  # type: ignore[call-arg]
