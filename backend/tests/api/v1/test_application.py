from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import create_app


def test_documentation_can_be_disabled(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_DOCS", False)
    with TestClient(create_app()) as client:
        for path in ("/docs", "/redoc", "/openapi.json"):
            assert client.get(path).status_code == 404
        assert client.get("/health-check/").json() == 1


def test_health_probe_is_exempt_from_rate_limit(client):
    for _ in range(70):
        assert client.get("/health-check/").status_code == 200


def test_rate_limited_response_includes_cors_headers(client):
    for _ in range(6):
        response = client.post(
            "/services/contact",
            headers={"Origin": "http://localhost:3000"},
            json={"email": "test@example.com", "subject": "Test", "content": "Hello"},
        )
    assert response.status_code == 429
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_openapi_operation_ids_are_unique_and_readable():
    schema = create_app().openapi()
    ids = [
        operation["operationId"]
        for path in schema["paths"].values()
        for operation in path.values()
    ]
    assert len(ids) == len(set(ids))
    assert schema["paths"]["/users/me"]["get"]["operationId"] == "users_read_user_me"
