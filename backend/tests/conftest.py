from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.db import engine, init_db
from app.main import app


@pytest.fixture()
def db() -> Generator[Session]:
    with Session(engine) as session:
        init_db(session)
        yield session


@pytest.fixture(scope="module")
def client() -> Generator[TestClient]:
    with TestClient(app) as c:
        yield c
