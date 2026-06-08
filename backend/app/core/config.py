from pydantic import (
    PostgresDsn,
    field_validator,
)
from pydantic_core.core_schema import FieldValidationInfo
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
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

    # DB SETTINGS

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
                scheme="postgresql+psycopg",
                username=values.data.get("POSTGRES_USER"),
                password=values.data.get("POSTGRES_PASSWORD"),
                host=values.data.get("POSTGRES_SERVER"),
                path=f"{values.data.get('POSTGRES_DB') or ''}",
            )
        )


settings = Settings()  # pyright: ignore
