import os
from collections.abc import Generator
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import MetaData, Table, inspect, text
from sqlmodel import SQLModel, create_engine

from app.core.config import settings

BACKEND = Path(__file__).resolve().parents[1]


@pytest.fixture
def migration_connection(tmp_path) -> Generator:
    if os.environ.get("TEMPLATE_TEST_POSTGRES") == "1":
        database = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        schema = f"migration_test_{uuid4().hex}"
        with database.connect() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET search_path TO "{schema}"'))
            connection.commit()
            try:
                yield connection
            finally:
                connection.rollback()
                connection.execute(text("SET search_path TO public"))
                connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
                connection.commit()
        database.dispose()
    else:
        database = create_engine(f"sqlite:///{tmp_path / 'migrations.db'}")
        with database.connect() as connection:
            yield connection
        database.dispose()


def alembic_config(connection):
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    config.attributes["connection"] = connection
    return config


def test_fresh_migrations_match_auth_16_models(migration_connection):
    config = alembic_config(migration_connection)
    command.upgrade(config, "head")
    context = MigrationContext.configure(
        migration_connection, opts={"compare_type": True}
    )
    assert compare_metadata(context, SQLModel.metadata) == []
    command.downgrade(config, "base")
    assert set(inspect(migration_connection).get_table_names()) <= {"alembic_version"}


def test_upgrade_preserves_users_and_revokes_legacy_sessions(migration_connection):
    config = alembic_config(migration_connection)
    command.upgrade(config, "66160a9ae8d8")
    metadata = MetaData()
    user = Table("user", metadata, autoload_with=migration_connection)
    refresh = Table("refreshtoken", metadata, autoload_with=migration_connection)
    social = Table("socialaccount", metadata, autoload_with=migration_connection)
    identity = (
        uuid4() if migration_connection.dialect.name == "postgresql" else uuid4().hex
    )
    migration_connection.execute(
        user.insert().values(
            id=identity,
            email="legacy@example.com",
            role="user",
            email_validated=False,
            is_active=True,
            is_superuser=False,
            full_name="Legacy User",
            language="it",
            created=datetime(2026, 1, 1),
            modified=datetime(2026, 1, 1),
            hashed_password="preserved-password-hash",
            totp_secret="preserved-totp-secret",
        )
    )
    migration_connection.execute(
        refresh.insert().values(token="legacy-raw-token", authenticates_id=identity)
    )
    social_id = (
        uuid4() if migration_connection.dialect.name == "postgresql" else uuid4().hex
    )
    migration_connection.execute(
        social.insert().values(
            id=social_id,
            provider="example",
            subject="legacy-subject",
            user_id=identity,
            created=datetime(2026, 1, 1),
        )
    )
    migration_connection.commit()
    if migration_connection.dialect.name == "postgresql":
        migration_connection.execute(text("SET TIME ZONE 'Europe/Rome'"))
        migration_connection.commit()
    command.upgrade(config, "head")
    if migration_connection.dialect.name == "postgresql":
        created = migration_connection.execute(
            text('SELECT created FROM "user"')
        ).scalar_one()
        assert created.astimezone(UTC) == datetime(2026, 1, 1, tzinfo=UTC)
    row = migration_connection.execute(
        text(
            'SELECT language, hashed_password, totp_secret, session_version FROM "user"'
        )
    ).one()
    assert tuple(row) == ("it", "preserved-password-hash", "preserved-totp-secret", 0)
    assert (
        migration_connection.execute(
            text("SELECT COUNT(*) FROM refreshtoken")
        ).scalar_one()
        == 0
    )
    assert migration_connection.execute(
        text("SELECT requires_relink FROM socialaccount")
    ).scalar_one()
    assert "token" not in {
        column["name"]
        for column in inspect(migration_connection).get_columns("refreshtoken")
    }
