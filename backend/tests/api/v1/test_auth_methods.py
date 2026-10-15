from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.testclient import TestClient
from fastapi_myauth.auth import FastAuth
from fastapi_myauth.config import PasskeyConfig
from fastapi_myauth.social import SocialProvider
from fastapi_myauth.transactions import transaction
from starlette.middleware.sessions import SessionMiddleware

from app.src.auth.service import auth

from .test_auth import PASSWORD, bearer, login, signup


def test_all_library_routes_are_mounted(client):
    schema = client.get("/openapi.json").json()
    library_app = FastAPI()
    library_app.include_router(auth.get_router())
    for path, operations in library_app.openapi()["paths"].items():
        assert path in schema["paths"]
        assert operations.keys() <= schema["paths"][path].keys()
    assert client.get("/login/methods").json() == {
        "social_providers": [],
        "passkeys": False,
        "registration": True,
    }
    assert client.post("/login/passkeys/authenticate/options").status_code == 404
    assert client.get("/login/social/unknown").status_code == 404


def test_closed_registration_is_reported_by_the_library(client, monkeypatch):
    monkeypatch.setattr(auth.config, "USERS_OPEN_REGISTRATION", False)
    assert client.get("/login/methods").json()["registration"] is False
    assert (
        client.post("/login/signup", json={"email": "closed@example.com"}).status_code
        == 400
    )


def test_duplicate_provider_names_are_rejected_by_the_library():
    from dataclasses import replace

    provider = SocialProvider.google(client_id="test-id", client_secret="test-secret")
    with pytest.raises(ValueError, match="unique"):
        replace(auth, social_providers=(provider, provider))


def test_social_session_middleware_is_absent_when_social_is_disabled():
    from app.main import create_app

    application = create_app()

    @application.get("/test-session")
    def session_present(request: Request):
        return {"has_session": "session" in request.scope}

    assert TestClient(application).get("/test-session").json() == {"has_session": False}


@pytest.mark.parametrize("https_only", [True, False])
def test_social_state_cookie_uses_explicit_deployment_configuration(
    monkeypatch, https_only
):
    from itsdangerous import TimestampSigner
    from pydantic import SecretStr

    from app.main import create_app
    from app.src.auth.config import auth_settings

    oauth_key = "test-separate-oauth-cookie-key-" * 2
    monkeypatch.setattr(
        auth_settings, "SOCIAL_SESSION_SECRET_KEY", SecretStr(oauth_key)
    )
    monkeypatch.setattr(auth_settings, "SOCIAL_SESSION_HTTPS_ONLY", https_only)
    monkeypatch.setattr(
        auth,
        "social_providers",
        (SocialProvider.google(client_id="id", client_secret="secret"),),
    )
    application = create_app()

    @application.get("/test-session")
    def set_oauth_state(request: Request):
        request.session["state"] = "test-state"
        return {"ok": True}

    response = TestClient(application).get("/test-session")
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "max-age=300" in cookie
    assert ("; secure" in cookie) is https_only
    TimestampSigner(oauth_key).unsign(response.cookies["auth_oauth_state"])


def optional_client(db, *, social=False, passkeys=False):
    instance = FastAuth(
        engine=auth.engine,
        components=auth.components,
        social_providers=(
            SocialProvider.google(client_id="test-id", client_secret="test-secret"),
        )
        if social
        else (),
        passkey_config=PasskeyConfig(
            rp_id="localhost", origins=("http://localhost:3000",)
        )
        if passkeys
        else None,
        social_popup=auth.social_popup,
    )
    application = FastAPI()
    application.add_middleware(SessionMiddleware, secret_key="test-oauth-session-key")
    application.include_router(instance.get_router(include_disabled_methods=True))

    def override_db():
        with transaction(db):
            yield db

    application.dependency_overrides[
        instance.deps.SessionDep.__metadata__[0].dependency
    ] = override_db
    return instance, TestClient(application)


def test_passkeys_are_configurable_and_protect_credentials(db):
    instance, client = optional_client(db, passkeys=True)
    assert client.get("/login/methods").json()["passkeys"] is True
    assert client.post("/login/passkeys/register/options").status_code == 401
    challenge = client.post("/login/passkeys/authenticate/options")
    assert challenge.status_code == 200
    assert challenge.json()["options"]["rpId"] == "localhost"
    assert (
        client.post(
            "/login/passkeys/authenticate/verify",
            json={
                "ceremony_id": challenge.json()["ceremony_id"],
                "credential": {},
            },
        ).status_code
        == 400
    )
    signup(client)
    headers = bearer(login(client)["access_token"])
    assert (
        client.post("/login/passkeys/register/options", headers=headers).status_code
        == 200
    )
    assert client.get("/login/passkeys/", headers=headers).json() == []
    missing = "/login/passkeys/00000000-0000-0000-0000-000000000001"
    assert (
        client.patch(missing, headers=headers, json={"name": "Test"}).status_code == 404
    )
    assert client.delete(missing, headers=headers).status_code == 404
    assert instance.passkey_config.rp_id == "localhost"


def test_social_redirect_and_callback_bridge_use_library_and_fixed_origin(
    db, monkeypatch
):
    instance, client = optional_client(db, social=True)
    provider = instance._oauth.create_client("google")

    async def authorize(request, redirect_uri):
        request.session["test-state"] = "state"
        assert str(redirect_uri) == "http://testserver/login/social/google/callback"
        return RedirectResponse("https://accounts.example.com/authorize?state=state")

    monkeypatch.setattr(provider, "authorize_redirect", authorize)
    monkeypatch.setattr(
        provider,
        "authorize_access_token",
        AsyncMock(
            return_value={
                "userinfo": {
                    "sub": "social-subject",
                    "email": "social@example.com",
                    "email_verified": True,
                }
            }
        ),
    )
    assert client.get("/login/methods").json()["social_providers"] == ["google"]
    response = client.get("/login/social/google")
    assert response.json()["url"].startswith("https://accounts.example.com/")
    assert "httponly" in response.headers["set-cookie"].lower()
    response = client.get("/login/social/google/callback")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert response.headers["cache-control"] == "no-store"
    assert "http://localhost:3000" in response.text
    assert "auth:social" in response.text
    assert "access_token" in response.text
    assert client.post("/login/social/google/link").status_code == 401
    assert client.delete("/login/social/google").status_code == 401


def test_callback_error_is_sent_to_popup_without_exception_details(db, monkeypatch):
    from authlib.integrations.base_client.errors import OAuthError

    instance, client = optional_client(db, social=True)
    provider = instance._oauth.create_client("google")
    monkeypatch.setattr(
        provider,
        "authorize_access_token",
        AsyncMock(side_effect=OAuthError(description="Private provider details")),
    )
    response = client.get("/login/social/google/callback")
    assert response.status_code == 200
    assert '"error": true' in response.text
    assert "Private provider details" not in response.text
    assert "access_token" not in response.text
    assert response.headers["cache-control"] == "no-store"


def test_revoke_refresh_only_revokes_the_selected_session(client):
    signup(client)
    first, second = login(client), login(client)
    assert (
        client.post("/login/revoke", headers=bearer(first["refresh_token"])).status_code
        == 200
    )
    assert (
        client.post(
            "/login/refresh", headers=bearer(first["refresh_token"])
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/login/refresh", headers=bearer(second["refresh_token"])
        ).status_code
        == 200
    )


def test_self_deletion_requires_auth_and_removes_account(client):
    assert client.delete("/users/me").status_code == 401
    signup(client)
    headers = bearer(login(client)["access_token"])
    assert client.delete("/users/me", headers=headers).status_code == 200
    assert client.get("/users/me", headers=headers).status_code == 404


@pytest.mark.parametrize(
    "method,path,payload",
    [
        ("get", "/users/", None),
        ("post", "/users/create", {"email": "other@example.com", "password": PASSWORD}),
        ("post", "/users/toggle-state", {"user_email": "other@example.com"}),
        ("get", "/users/00000000-0000-0000-0000-000000000001", None),
        ("post", "/users/00000000-0000-0000-0000-000000000001", {"role": "admin"}),
        ("delete", "/users/00000000-0000-0000-0000-000000000001", None),
    ],
)
def test_all_admin_operations_reject_visitors_and_other_users(
    client, method, path, payload
):
    assert client.request(method, path, json=payload).status_code == 401
    signup(client)
    assert (
        client.request(
            method, path, json=payload, headers=bearer(login(client)["access_token"])
        ).status_code
        == 403
    )


def test_passkey_credentials_are_scoped_to_their_owner(db):
    from uuid import UUID

    from fastapi_myauth.models import PasskeyCredential

    _, client = optional_client(db, passkeys=True)
    owner = signup(client)
    key = PasskeyCredential(
        credential_id=b"test-credential",
        public_key=b"test-public-key",
        name="Laptop",
        user_id=UUID(owner["id"]),
        device_type="single_device",
    )
    db.add(key)
    db.flush()
    owner_headers = bearer(login(client)["access_token"])
    signup(client, email="second@example.com")
    other_headers = bearer(login(client, email="second@example.com")["access_token"])
    path = f"/login/passkeys/{key.id}"
    assert client.get("/login/passkeys/", headers=other_headers).json() == []
    assert (
        client.patch(path, json={"name": "Stolen"}, headers=other_headers).status_code
        == 404
    )
    assert client.delete(path, headers=other_headers).status_code == 404
    assert (
        client.patch(path, json={"name": "Renamed"}, headers=owner_headers).json()[
            "name"
        ]
        == "Renamed"
    )
    assert client.delete(path, headers=owner_headers).status_code == 200
    assert client.get("/users/me", headers=owner_headers).status_code == 401
