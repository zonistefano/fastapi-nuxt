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
