from unittest.mock import patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from fastapi_myauth.models import EmailContent

from app.src.auth.service import auth


@pytest.fixture
def contact_data() -> dict:
    return {
        "email": "test@example.com",
        "subject": "Test Subject",
        "content": "This is a test message.",
    }


@patch("app.src.auth.api.endpoints.services.send_web_contact_email")
def test_send_email_success(
    mock_send_email, client: TestClient, contact_data: dict, monkeypatch
):
    monkeypatch.setattr(auth.config, "EMAILS_ENABLED", True)
    response = client.post("/services/contact", json=contact_data)
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["msg"] == "Web contact email sent"
    mock_send_email.assert_called_once()
    mock_send_email.assert_called_with(
        data=EmailContent(**contact_data), config=auth.config
    )


def test_contact_is_unavailable_without_smtp(client: TestClient, contact_data: dict):
    response = client.post("/services/contact", json=contact_data)
    assert response.status_code == 503


def test_contact_uses_packaged_template(
    client: TestClient, contact_data: dict, monkeypatch
):
    monkeypatch.setattr(auth.config, "EMAILS_ENABLED", True)
    with patch("fastapi_myauth.email.emails.Message.send") as smtp:
        smtp.return_value.status_code = 250
        response = client.post("/services/contact", json=contact_data)
    assert response.status_code == 201
    assert smtp.call_args.kwargs["to"] == auth.config.EMAILS_TO_EMAIL


def test_contact_reports_delivery_failure(
    client: TestClient, contact_data: dict, monkeypatch
):
    monkeypatch.setattr(auth.config, "EMAILS_ENABLED", True)
    with patch("fastapi_myauth.email.emails.Message.send") as smtp:
        smtp.return_value.status_code = 550
        response = client.post("/services/contact", json=contact_data)
    assert response.status_code == 503


def test_contact_rate_limit(client: TestClient, contact_data: dict):
    for _ in range(5):
        assert client.post("/services/contact", json=contact_data).status_code == 503
    response = client.post("/services/contact", json=contact_data)
    assert response.status_code == 429
    assert int(response.headers["Retry-After"]) > 0


def test_send_email_missing_fields(client: TestClient, contact_data: dict):
    # Missing email
    payload = contact_data.copy()
    payload.pop("email")
    response = client.post("/services/contact", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    # Missing subject
    payload = contact_data.copy()
    payload.pop("subject")
    response = client.post("/services/contact", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    # Missing content
    payload = contact_data.copy()
    payload.pop("content")
    response = client.post("/services/contact", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_send_email_invalid_email_format(client: TestClient, contact_data: dict):
    contact_data["email"] = "invalid-email"
    response = client.post("/services/contact", json=contact_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
