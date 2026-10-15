from fastapi_myauth.config import PasskeyConfig
from fastapi_myauth.config import Settings as BaseAuthSettings
from fastapi_myauth.social import SocialProviderConfig
from pydantic import (
    EmailStr,
    Field,
    SecretStr,
    model_validator,
)
from pydantic_settings import BaseSettings


class AuthSettings(BaseAuthSettings, BaseSettings):
    """Load the library's settings from the environment with persistent keys."""

    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str = Field(min_length=8, max_length=64)
    SECRET_KEY: str = Field(min_length=32)
    TOTP_SECRET_KEY: str
    SERVER_BOT: str = "Assistant"
    SOCIAL_PROVIDERS: list[SocialProviderConfig] = Field(default_factory=list)
    PASSKEY_CONFIG: PasskeyConfig | None = None
    SOCIAL_SESSION_SECRET_KEY: SecretStr | None = Field(default=None, min_length=32)
    SOCIAL_SESSION_HTTPS_ONLY: bool = True

    @model_validator(mode="after")
    def require_social_session_key(self) -> "AuthSettings":
        if self.SOCIAL_PROVIDERS and self.SOCIAL_SESSION_SECRET_KEY is None:
            raise ValueError("Social login requires SOCIAL_SESSION_SECRET_KEY.")
        return self


auth_settings = AuthSettings()  # type: ignore[call-arg]
