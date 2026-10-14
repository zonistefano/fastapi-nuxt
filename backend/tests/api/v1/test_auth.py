from datetime import timedelta
from unittest.mock import patch

import pyotp
import pytest
from fastapi.testclient import TestClient
from fastapi_myauth import security
from fastapi_myauth.models import LoginChallenge, RefreshToken, TOTPRecoveryCode
from freezegun import freeze_time
from sqlmodel import Session, select

from app.src.auth.service import auth

PASSWORD = "test-user-password"
EMAIL = "user@example.com"


def signup(client: TestClient, **fields):
    response = client.post(
        "/login/signup", json={"email": EMAIL, "password": PASSWORD, **fields}
    )
    assert response.status_code == 200, response.text
    return response.json()


def login(client: TestClient, email=EMAIL, password=PASSWORD):
    response = client.post(
        "/login/oauth", data={"username": email, "password": password}
    )
    assert response.status_code == 200, response.text
    return response.json()


def bearer(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_signup_defaults_and_custom_fields(client):
    profile = signup(
        client, language="it", is_superuser=True, role="admin", email_validated=True
    )
    assert profile["language"] == "it"
    assert profile["is_superuser"] is False
    assert profile["role"] == "user"
    assert profile["email_validated"] is False
    assert profile["hashed_password"] is True
    assert profile["totp"] is False
    assert "session_version" not in profile
    tokens = login(client)
    response = client.get("/users/me", headers=bearer(tokens["access_token"]))
    assert response.status_code == 200
    assert response.json() == profile


def test_signup_without_language_uses_database_default(client):
    assert signup(client)["language"] == "en"


@pytest.mark.parametrize("language", [None, "", "x" * 11])
def test_invalid_language_rejected_on_signup(client, language):
    response = client.post(
        "/login/signup",
        json={"email": EMAIL, "password": PASSWORD, "language": language},
    )
    assert response.status_code == 422


def test_profile_update_preserves_omitted_language_and_account_privileges(client):
    signup(client, language="it")
    headers = bearer(login(client)["access_token"])
    response = client.put(
        "/users/me",
        headers=headers,
        json={
            "original": PASSWORD,
            "full_name": "Test",
            "is_superuser": True,
            "role": "admin",
        },
    )
    assert response.status_code == 200
    assert response.json()["language"] == "it"
    assert response.json()["is_superuser"] is False
    assert response.json()["role"] == "user"
    assert (
        client.put(
            "/users/me", headers=headers, json={"original": PASSWORD, "language": None}
        ).status_code
        == 422
    )
    response = client.put(
        "/users/me", headers=headers, json={"original": PASSWORD, "language": "fr"}
    )
    assert response.status_code == 200
    assert response.json()["language"] == "fr"


def test_user_administration_requires_admin(client):
    assert client.get("/").status_code == 404
    assert client.get("/users/").status_code == 401
    signup(client)
    assert (
        client.get("/users/", headers=bearer(login(client)["access_token"])).status_code
        == 403
    )
    headers = bearer(
        login(
            client, auth.config.FIRST_SUPERUSER, auth.config.FIRST_SUPERUSER_PASSWORD
        )["access_token"]
    )
    response = client.get("/users/", headers=headers)
    assert response.status_code == 200
    assert all(isinstance(user["hashed_password"], bool) for user in response.json())
    assert client.get("/users/?page=-1", headers=headers).status_code == 422


def test_refresh_rotation_stores_hash_and_rejects_replay(client, db: Session):
    signup(client)
    tokens = login(client)
    row = db.exec(select(RefreshToken)).one()
    assert row.token_hash == security.token_digest(tokens["refresh_token"])
    assert len(row.token_hash) == 64
    response = client.post("/login/refresh", headers=bearer(tokens["refresh_token"]))
    assert response.status_code == 200
    rotated = response.json()
    assert rotated["refresh_token"] != tokens["refresh_token"]
    assert (
        client.post(
            "/login/refresh", headers=bearer(tokens["refresh_token"])
        ).status_code
        == 401
    )
    assert (
        client.get("/users/me", headers=bearer(rotated["refresh_token"])).status_code
        == 401
    )
    assert (
        client.get("/users/me", headers=bearer(rotated["access_token"])).status_code
        == 200
    )


def test_logout_all_immediately_revokes_access_and_refresh(client):
    signup(client)
    first = login(client)
    second = login(client)
    assert (
        client.post(
            "/login/logout-all", headers=bearer(first["access_token"])
        ).status_code
        == 200
    )
    for tokens in (first, second):
        assert (
            client.get("/users/me", headers=bearer(tokens["access_token"])).status_code
            == 401
        )
        assert (
            client.post(
                "/login/refresh", headers=bearer(tokens["refresh_token"])
            ).status_code
            == 401
        )


def test_password_change_invalidates_previous_session(client):
    signup(client)
    tokens = login(client)
    response = client.put(
        "/users/me",
        headers=bearer(tokens["access_token"]),
        json={"original": PASSWORD, "password": "replacement-password"},
    )
    assert response.status_code == 200
    assert (
        client.get("/users/me", headers=bearer(tokens["access_token"])).status_code
        == 401
    )
    assert login(client, password="replacement-password")["access_token"]


def test_recent_authentication_cannot_be_extended_by_refresh(client):
    with freeze_time("2026-10-14 12:00:00", tick=True) as clock:
        signup(client)
        tokens = login(client)
        clock.tick(timedelta(seconds=auth.config.RECENT_AUTH_EXPIRE_SECONDS + 1))
        refreshed = client.post(
            "/login/refresh", headers=bearer(tokens["refresh_token"])
        )
        assert refreshed.status_code == 200
        headers = bearer(refreshed.json()["access_token"])
        assert client.post("/login/new-totp", headers=headers).status_code == 403
        response = client.post(
            "/login/reauth", headers=headers, json={"password": PASSWORD}
        )
        assert response.status_code == 200
        assert (
            client.post(
                "/login/new-totp", headers=bearer(response.json()["access_token"])
            ).status_code
            == 200
        )


def test_email_confirmation_delivers_packaged_template_and_is_single_use(
    client, db, monkeypatch
):
    monkeypatch.setattr(auth.config, "REQUIRE_EMAIL_VALIDATION", True)
    monkeypatch.setattr(auth.config, "EMAILS_ENABLED", True)
    with patch("fastapi_myauth.email.emails.Message.send") as smtp:
        smtp.return_value.status_code = 250
        signup(client)
    link = smtp.call_args.kwargs["render"]["link"]
    token = link.split("?token=")[1]
    assert db.exec(select(LoginChallenge)).one().purpose == "email_confirmation"
    assert (
        client.get("/login/confirm-email", params={"token": token}).status_code == 200
    )
    assert (
        client.get("/login/confirm-email", params={"token": token}).status_code == 400
    )
    assert login(client)["access_token"]


def test_failed_signup_email_rolls_back_account(client, db, monkeypatch):
    monkeypatch.setattr(auth.config, "REQUIRE_EMAIL_VALIDATION", True)
    monkeypatch.setattr(auth.config, "EMAILS_ENABLED", True)
    with patch("fastapi_myauth.email.emails.Message.send") as smtp:
        smtp.return_value.status_code = 550
        with pytest.raises(RuntimeError, match="Email delivery failed"):
            client.post("/login/signup", json={"email": EMAIL, "password": PASSWORD})
    assert auth.crud_user.get_by_email(db, email=EMAIL) is None
    assert not db.exec(select(LoginChallenge)).all()


def test_totp_enrollment_recovery_and_disable_replace_sessions(client, db):
    with freeze_time("2026-10-14 12:00:00", tick=True):
        signup(client)
        tokens = login(client)
        headers = bearer(tokens["access_token"])
        setup = client.post("/login/new-totp", headers=headers)
        assert setup.status_code == 200
        uri = setup.json()["uri"]
        code = pyotp.parse_uri(uri).now()
        response = client.put(
            "/login/totp",
            headers=headers,
            json={"uri": uri, "claim": code, "password": PASSWORD},
        )
        assert response.status_code == 200, response.text
        enrolled = response.json()
        assert len(enrolled["recovery_codes"]) == 10
        assert client.get("/users/me", headers=headers).status_code == 401
        assert (
            client.get(
                "/users/me", headers=bearer(enrolled["tokens"]["access_token"])
            ).json()["totp"]
            is True
        )
        assert all(
            row.code_hash not in enrolled["recovery_codes"]
            for row in db.exec(select(TOTPRecoveryCode)).all()
        )
        restricted = login(client)
        assert restricted["refresh_token"] is None
        assert (
            client.get(
                "/users/me", headers=bearer(restricted["access_token"])
            ).status_code
            == 401
        )
        recovery = enrolled["recovery_codes"][0]
        response = client.post(
            "/login/totp/recover",
            headers=bearer(restricted["access_token"]),
            json={"claim": recovery},
        )
        assert response.status_code == 200, response.text
        fresh = response.json()
        restricted_again = login(client)
        assert (
            client.post(
                "/login/totp/recover",
                headers=bearer(restricted_again["access_token"]),
                json={"claim": recovery},
            ).status_code
            == 400
        )
        response = client.request(
            "DELETE",
            "/login/totp",
            headers=bearer(fresh["access_token"]),
            json={"original": PASSWORD},
        )
        assert response.status_code == 200, response.text
        assert (
            client.get("/users/me", headers=bearer(fresh["access_token"])).status_code
            == 401
        )
        assert (
            client.get(
                "/users/me", headers=bearer(response.json()["tokens"]["access_token"])
            ).json()["totp"]
            is False
        )
        assert not db.exec(select(TOTPRecoveryCode)).all()


def test_registration_can_be_closed_via_configuration(client, monkeypatch):
    monkeypatch.setattr(auth.config, "USERS_OPEN_REGISTRATION", False)
    assert (
        client.post(
            "/login/signup", json={"email": EMAIL, "password": PASSWORD}
        ).status_code
        == 400
    )


def test_magic_login_is_single_use(client, monkeypatch):
    signup(client)
    monkeypatch.setattr(auth.config, "EMAILS_ENABLED", True)
    with patch("fastapi_myauth.email.emails.Message.send") as smtp:
        smtp.return_value.status_code = 250
        response = client.post(f"/login/magic/{EMAIL}")
    assert response.status_code == 200
    claim = response.json()["claim"]
    email_token = smtp.call_args.kwargs["render"]["link"].split("?magic=")[1]
    response = client.post(
        "/login/claim", headers=bearer(email_token), json=response.json()
    )
    assert response.status_code == 200
    assert (
        client.get(
            "/users/me", headers=bearer(response.json()["access_token"])
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/login/claim", headers=bearer(email_token), json={"claim": claim}
        ).status_code
        == 400
    )


def test_password_reset_revokes_sessions_and_email_token_cannot_log_in(
    client, monkeypatch
):
    signup(client)
    tokens = login(client)
    monkeypatch.setattr(auth.config, "EMAILS_ENABLED", True)
    with patch("fastapi_myauth.email.emails.Message.send") as smtp:
        smtp.return_value.status_code = 250
        response = client.post(f"/login/recover/{EMAIL}")
    assert response.status_code == 200
    claim = response.json()["claim"]
    email_token = smtp.call_args.kwargs["render"]["link"].split("?token=")[1]
    assert (
        client.post(
            "/login/claim", headers=bearer(email_token), json={"claim": claim}
        ).status_code
        == 400
    )
    response = client.post(
        "/login/reset",
        headers=bearer(email_token),
        json={"claim": claim, "new_password": "reset-user-password"},
    )
    assert response.status_code == 200
    assert (
        client.get("/users/me", headers=bearer(tokens["access_token"])).status_code
        == 401
    )
    assert (
        client.post(
            "/login/reset",
            headers=bearer(email_token),
            json={"claim": claim, "new_password": PASSWORD},
        ).status_code
        == 400
    )
    assert login(client, password="reset-user-password")["access_token"]
