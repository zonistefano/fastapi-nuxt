import base64
import os
from collections.abc import Generator

# Direct pytest runs use disposable SQLite, without loading the development .env.
# The Compose runner explicitly opts into its disposable PostgreSQL database.
for key, value in {
    "PROJECT_NAME": "Backend tests",
    "BACKEND_CORS_ORIGINS": '["http://localhost:3000"]',
    "POSTGRES_SERVER": "localhost",
    "POSTGRES_USER": "test",
    "POSTGRES_PASSWORD": "test",
    "POSTGRES_DB": "test",
    "FIRST_SUPERUSER": "admin@example.com",
    "FIRST_SUPERUSER_PASSWORD": "test-admin-password",
    "SECRET_KEY": "test-signing-key-" * 4,
    "TOTP_SECRET_KEY": base64.urlsafe_b64encode(b"t" * 32).decode(),
    "REQUIRE_EMAIL_VALIDATION": "false",
}.items():
    os.environ.setdefault(key, value)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from fastapi_myauth.rate_limit import InMemoryRateLimitBackend  # noqa: E402
from fastapi_myauth.transactions import transaction  # noqa: E402
from sqlalchemy import event  # noqa: E402
from sqlmodel import Session, SQLModel, create_engine  # noqa: E402
from sqlmodel.pool import StaticPool  # noqa: E402

from app.core.db import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.src.auth.service import auth  # noqa: E402


@pytest.fixture()
def db() -> Generator[Session]:
    use_postgres = os.environ.get("TEMPLATE_TEST_POSTGRES") == "1"
    test_engine = (
        engine
        if use_postgres
        else create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
    )
    if not use_postgres:

        @event.listens_for(test_engine, "connect")
        def configure_sqlite(connection, _record):
            connection.isolation_level = None
            connection.execute("PRAGMA foreign_keys=ON")

        @event.listens_for(test_engine, "begin")
        def begin_sqlite(connection):
            connection.exec_driver_sql("BEGIN")

        SQLModel.metadata.create_all(test_engine)
    with test_engine.connect() as connection:
        outer = connection.begin()
        with Session(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            init_db(session)
            yield session
        outer.rollback()
    if not use_postgres:
        test_engine.dispose()


@pytest.fixture()
def client(db: Session, monkeypatch) -> Generator[TestClient]:
    def override_db():
        with transaction(db):
            yield db

    monkeypatch.setattr(auth.config, "REQUIRE_EMAIL_VALIDATION", False)
    monkeypatch.setattr(auth.config, "EMAILS_ENABLED", False)
    monkeypatch.setattr(auth.config, "USERS_OPEN_REGISTRATION", True)
    monkeypatch.setattr(auth.rate_limiter.config, "backend", InMemoryRateLimitBackend())
    overrides = app.dependency_overrides.copy()
    app.dependency_overrides[auth.deps.SessionDep.__metadata__[0].dependency] = (
        override_db
    )
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides = overrides
