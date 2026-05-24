from collections.abc import Generator
from unittest.mock import patch
from uuid import UUID, uuid4

from fastapi import status
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel

from app.api.deps import CurrentUser
from app.core.config import settings
from app.core.db import engine
from app.crud import chat as crud_chat
from app.crud import crud_user
from app.main import app


def override_user(db: Session):
    user = crud_user.get_by_email(db, email=settings.FIRST_SUPERUSER)
    app.dependency_overrides[CurrentUser] = lambda: user
    return user


def stream_text(*_args, **_kwargs) -> Generator[str]:
    yield "Hello"
    yield " there"


def setup_chat_tables():
    SQLModel.metadata.create_all(engine)


def test_chat_requires_auth(client: TestClient):
    response = client.get(f"{settings.API_V1_STR}/chats")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_list_load_rename_delete_chat(client: TestClient, db: Session):
    setup_chat_tables()
    user = override_user(db)

    try:
        create_response = client.post(
            f"{settings.API_V1_STR}/chats",
            json={"title": "Planning"},
        )
        assert create_response.status_code == status.HTTP_201_CREATED
        chat_id = create_response.json()["id"]

        list_response = client.get(f"{settings.API_V1_STR}/chats")
        assert list_response.status_code == status.HTTP_200_OK
        assert any(chat["id"] == chat_id for chat in list_response.json())

        load_response = client.get(f"{settings.API_V1_STR}/chats/{chat_id}")
        assert load_response.status_code == status.HTTP_200_OK
        assert load_response.json()["messages"] == []

        rename_response = client.patch(
            f"{settings.API_V1_STR}/chats/{chat_id}",
            json={"title": "Renamed"},
        )
        assert rename_response.status_code == status.HTTP_200_OK
        assert rename_response.json()["title"] == "Renamed"

        delete_response = client.delete(f"{settings.API_V1_STR}/chats/{chat_id}")
        assert delete_response.status_code == status.HTTP_204_NO_CONTENT
        assert crud_chat.get_chat(db, chat_id=UUID(chat_id), user_id=user.id) is None
    finally:
        app.dependency_overrides.clear()


@patch("app.api.v1.endpoints.chats.stream_chat_response", side_effect=stream_text)
def test_stream_persists_user_and_assistant_messages(
    _mock_stream,
    client: TestClient,
    db: Session,
):
    setup_chat_tables()
    user = override_user(db)

    try:
        chat = crud_chat.create_chat(db, user_id=user.id)
        response = client.post(
            f"{settings.API_V1_STR}/chats/{chat.id}/messages/stream",
            json={"content": "Say hello"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert "event: delta" in response.text
        assert "event: done" in response.text

        messages = crud_chat.get_messages(db, chat_id=chat.id)
        assert [message.role for message in messages] == ["user", "assistant"]
        assert messages[0].content == "Say hello"
        assert messages[1].content == "Hello there"
    finally:
        crud_chat.delete_chat(db, chat=chat)
        app.dependency_overrides.clear()


@patch("app.api.v1.endpoints.chats.stream_chat_response", side_effect=stream_text)
def test_regenerate_replaces_last_assistant_message(
    _mock_stream,
    client: TestClient,
    db: Session,
):
    setup_chat_tables()
    user = override_user(db)

    try:
        chat = crud_chat.create_chat(db, user_id=user.id)
        crud_chat.create_message(db, chat_id=chat.id, role="user", content="Hi")
        old_assistant = crud_chat.create_message(
            db,
            chat_id=chat.id,
            role="assistant",
            content="Old answer",
        )

        response = client.post(f"{settings.API_V1_STR}/chats/{chat.id}/regenerate")
        assert response.status_code == status.HTTP_200_OK
        assert "event: done" in response.text

        messages = crud_chat.get_messages(db, chat_id=chat.id)
        assert [message.role for message in messages] == ["user", "assistant"]
        assert messages[1].id != old_assistant.id
        assert messages[1].content == "Hello there"
    finally:
        crud_chat.delete_chat(db, chat=chat)
        app.dependency_overrides.clear()


def test_user_cannot_access_another_users_chat(client: TestClient, db: Session):
    setup_chat_tables()
    user = override_user(db)
    chat = crud_chat.create_chat(db, user_id=user.id)
    app.dependency_overrides[CurrentUser] = lambda: type(
        "UserStub",
        (),
        {"id": uuid4()},
    )()

    try:
        response = client.get(f"{settings.API_V1_STR}/chats/{chat.id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        crud_chat.delete_chat(db, chat=chat)
        app.dependency_overrides.clear()
