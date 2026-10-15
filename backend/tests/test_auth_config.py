import base64

import pytest
from pydantic import ValidationError

from app.src.auth.config import AuthSettings


def test_replicas_use_the_configured_keys() -> None:
    values = {
        "SECRET_KEY": "a" * 64,
        "TOTP_SECRET_KEY": base64.urlsafe_b64encode(b"b" * 32).decode(),
    }
    first = AuthSettings(**values)
    second = AuthSettings(**values)
    assert first.SECRET_KEY == second.SECRET_KEY == values["SECRET_KEY"]
    assert first.TOTP_SECRET_KEY == second.TOTP_SECRET_KEY == values["TOTP_SECRET_KEY"]


def test_missing_authentication_keys_prevent_startup(monkeypatch) -> None:
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("TOTP_SECRET_KEY", raising=False)
    with pytest.raises(ValidationError) as error:
        AuthSettings()
    missing = {item["loc"][0] for item in error.value.errors()}
    assert {"SECRET_KEY", "TOTP_SECRET_KEY"} <= missing


def test_invalid_encryption_key_is_rejected() -> None:
    with pytest.raises(ValidationError):
        AuthSettings(TOTP_SECRET_KEY="invalid")


def test_optional_auth_configuration_and_secret_redaction():
    from fastapi_myauth.config import PasskeyConfig
    from fastapi_myauth.social import SocialProviderConfig

    provider = SocialProviderConfig(
        name="google",
        client_id="test-id",
        client_secret="external-provider-test-secret",
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    )
    assert "external-provider-test-secret" not in repr(provider)
    assert provider.to_provider().client_secret == "external-provider-test-secret"
    settings = AuthSettings(
        SOCIAL_PROVIDERS=[provider],
        PASSKEY_CONFIG=PasskeyConfig(
            rp_id="example.com",
            origins=("https://app.example.com",),
        ),
    )
    assert settings.PASSKEY_CONFIG.rp_id == "example.com"
    with pytest.raises(ValidationError):
        SocialProviderConfig(
            **{
                **provider.model_dump(),
                "server_metadata_url": "http://example.com/metadata",
            }
        )


def test_social_login_requires_a_separate_persistent_session_key(monkeypatch):
    monkeypatch.delenv("SOCIAL_SESSION_SECRET_KEY", raising=False)
    assert AuthSettings(SOCIAL_PROVIDERS=[]).SOCIAL_SESSION_SECRET_KEY is None
    with pytest.raises(ValidationError, match="SOCIAL_SESSION_SECRET_KEY"):
        AuthSettings(
            SOCIAL_PROVIDERS=[
                {
                    "name": "google",
                    "client_id": "test-id",
                    "client_secret": "test-secret",
                    "server_metadata_url": "https://accounts.google.com/.well-known/openid-configuration",
                }
            ]
        )


def test_provider_configuration_is_loaded_from_environment(monkeypatch):
    monkeypatch.setenv(
        "SOCIAL_PROVIDERS",
        '[{"name":" Google ","client_id":"test-id","client_secret":"test-secret",'
        '"server_metadata_url":"https://accounts.google.com/.well-known/openid-configuration"}]',
    )
    settings = AuthSettings()
    provider = settings.SOCIAL_PROVIDERS[0]
    assert provider.name == "google"
    assert provider.to_provider().client_id == "test-id"
    assert "test-secret" not in settings.model_dump_json()
