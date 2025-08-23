from unittest.mock import patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from fastapi_myauth.models import EmailContent

from app.core.config import settings


@pytest.fixture
def contact_data() -> dict:
    return {
        "email": "test@example.com",
        "subject": "Test Subject",
        "content": "This is a test message.",
    }


@patch("app.api.v1.endpoints.services.send_web_contact_email")
def test_send_email_success(mock_send_email, client: TestClient, contact_data: dict):
    response = client.post(f"{settings.API_V1_STR}/services/contact", json=contact_data)
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["msg"] == "Web contact email sent"
    mock_send_email.assert_called_once()
    mock_send_email.assert_called_with(data=EmailContent(**contact_data))


def test_send_email_missing_fields(client: TestClient, contact_data: dict):
    # Missing email
    payload = contact_data.copy()
    payload.pop("email")
    response = client.post(f"{settings.API_V1_STR}/services/contact", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Missing subject
    payload = contact_data.copy()
    payload.pop("subject")
    response = client.post(f"{settings.API_V1_STR}/services/contact", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Missing content
    payload = contact_data.copy()
    payload.pop("content")
    response = client.post(f"{settings.API_V1_STR}/services/contact", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_send_email_invalid_email_format(client: TestClient, contact_data: dict):
    contact_data["email"] = "invalid-email"
    response = client.post(f"{settings.API_V1_STR}/services/contact", json=contact_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
