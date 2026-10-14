from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy.engine import make_url

from app.core.config import Settings
from app.src.auth.config import AuthSettings


@pytest.mark.parametrize(
    "value",
    ['["http://localhost:3000/"]', "http://localhost:3000, https://example.com", ""],
)
def test_cors_supports_json_comma_separated_and_empty_values(monkeypatch, value):
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", value)
    config = Settings()
    assert all(
        origin and not origin.endswith("/") for origin in config.BACKEND_CORS_ORIGINS
    )


def test_wildcard_cors_is_rejected():
    with pytest.raises(ValidationError):
        Settings(BACKEND_CORS_ORIGINS=["*"])


def test_database_url_preserves_special_characters():
    config = Settings(
        POSTGRES_USER="user@name",
        POSTGRES_PASSWORD="p@ss:/?#%",
        POSTGRES_DB="app",
        POSTGRES_PORT=5433,
        SQLALCHEMY_DATABASE_URI=None,
    )
    url = make_url(config.SQLALCHEMY_DATABASE_URI)
    assert url.username == "user@name"
    assert url.password == "p@ss:/?#%"
    assert url.port == 5433


def test_library_settings_are_loaded_from_environment(monkeypatch):
    monkeypatch.setenv("USERS_OPEN_REGISTRATION", "false")
    monkeypatch.setenv("SESSION_MAX_LIFETIME_SECONDS", "3600")
    monkeypatch.setenv("SMTP_SSL", "true")
    config = AuthSettings()
    assert config.USERS_OPEN_REGISTRATION is False
    assert config.SESSION_MAX_LIFETIME_SECONDS == 3600
    assert config.SMTP_SSL is True
    assert Path(config.EMAIL_TEMPLATES_DIR, "magic_login.html").is_file()


def test_mail_enabled_requires_complete_configuration():
    with pytest.raises(ValidationError):
        AuthSettings(EMAILS_ENABLED=True, SMTP_HOST=None)


@pytest.mark.parametrize(
    "field",
    [
        "ACCESS_TOKEN_EXPIRE_SECONDS",
        "RECENT_AUTH_EXPIRE_SECONDS",
        "SESSION_MAX_LIFETIME_SECONDS",
        "MULTI_MAX",
    ],
)
def test_nonpositive_library_limits_are_rejected(field):
    with pytest.raises(ValidationError):
        AuthSettings(**{field: 0})


@pytest.mark.parametrize("value", [0, 65536])
def test_invalid_database_ports_produce_validation_errors(value):
    with pytest.raises(ValidationError):
        Settings(POSTGRES_PORT=value)
