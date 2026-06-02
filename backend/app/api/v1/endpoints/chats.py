import json
from collections.abc import Iterator
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.api.deps import CurrentUser, SessionDep
from app.crud import chat as crud_chat
from app.models.chat import (
    Chat,
    ChatCreate,
    ChatMessageCreate,
    ChatRead,
    ChatSummary,
    ChatUpdate,
)
from app.services.llm import make_chat_title, stream_chat_response

router = APIRouter()


def _owned_chat_or_404(db: Session, *, chat_id: UUID, user_id: UUID) -> Chat:
    chat = crud_chat.get_chat(db, chat_id=chat_id, user_id=user_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )
    return chat


def _chat_read(db: Session, *, chat: Chat) -> ChatRead:
    return ChatRead(
        id=chat.id,
        title=chat.title,
        created=chat.created,
        modified=chat.modified,
        messages=crud_chat.get_messages(db, chat_id=chat.id),
    )


def _sse(event: str, data: dict | str) -> str:
    payload = data if isinstance(data, str) else json.dumps(data)
    return f"event: {event}\ndata: {payload}\n\n"


def _stream_and_persist(
    db: Session,
    *,
    chat_id: UUID,
    messages: list[dict[str, str]],
) -> Iterator[str]:
    chunks: list[str] = []
    try:
        for delta in stream_chat_response(messages):
            chunks.append(delta)
            yield _sse("delta", {"content": delta})
        assistant_content = "".join(chunks).strip()
        if assistant_content:
            assistant = crud_chat.create_message(
                db,
                chat_id=chat_id,
                role="assistant",
                content=assistant_content,
            )
            yield _sse(
                "done",
                {
                    "message": {
                        "id": str(assistant.id),
                        "chat_id": str(assistant.chat_id),
                        "role": assistant.role,
                        "content": assistant.content,
                        "created": assistant.created.isoformat(),
                    }
                },
            )
        else:
            yield _sse("error", {"detail": "The assistant returned an empty response."})
    except Exception as error:
        yield _sse("error", {"detail": str(error)})


@router.get("", response_model=list[ChatSummary])
def list_chats(db: SessionDep, current_user=Depends(CurrentUser)) -> list[Chat]:
    return crud_chat.get_chats(db, user_id=current_user.id)


@router.post("", response_model=ChatSummary, status_code=status.HTTP_201_CREATED)
def create_chat(
    *,
    db: SessionDep,
    data: ChatCreate,
    current_user=Depends(CurrentUser),
) -> Chat:
    return crud_chat.create_chat(db, user_id=current_user.id, title=data.title)


@router.get("/{chat_id}", response_model=ChatRead)
def get_chat(
    *,
    db: SessionDep,
    chat_id: UUID,
    current_user=Depends(CurrentUser),
) -> ChatRead:
    chat = _owned_chat_or_404(db, chat_id=chat_id, user_id=current_user.id)
    return _chat_read(db, chat=chat)


@router.patch("/{chat_id}", response_model=ChatSummary)
def update_chat(
    *,
    db: SessionDep,
    chat_id: UUID,
    data: ChatUpdate,
    current_user=Depends(CurrentUser),
) -> Chat:
    chat = _owned_chat_or_404(db, chat_id=chat_id, user_id=current_user.id)
    return crud_chat.update_chat_title(db, chat=chat, title=data.title)


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    *,
    db: SessionDep,
    chat_id: UUID,
    current_user=Depends(CurrentUser),
) -> None:
    chat = _owned_chat_or_404(db, chat_id=chat_id, user_id=current_user.id)
    crud_chat.delete_chat(db, chat=chat)


@router.post("/{chat_id}/messages/stream")
def stream_message(
    *,
    db: SessionDep,
    chat_id: UUID,
    data: ChatMessageCreate,
    current_user=Depends(CurrentUser),
) -> StreamingResponse:
    chat = _owned_chat_or_404(db, chat_id=chat_id, user_id=current_user.id)
    chat_id_value = chat.id
    crud_chat.create_message(
        db,
        chat_id=chat_id_value,
        role="user",
        content=data.content.strip(),
    )
    if chat.title == "Untitled":
        crud_chat.update_chat_title(db, chat=chat, title=make_chat_title(data.content))
    messages = [
        {"role": message.role, "content": message.content}
        for message in crud_chat.get_messages(db, chat_id=chat_id_value)
        if message.role in {"user", "assistant", "system"}
    ]
    return StreamingResponse(
        _stream_and_persist(db, chat_id=chat_id_value, messages=messages),
        media_type="text/event-stream",
    )


@router.post("/{chat_id}/regenerate")
def regenerate_message(
    *,
    db: SessionDep,
    chat_id: UUID,
    current_user=Depends(CurrentUser),
) -> StreamingResponse:
    chat = _owned_chat_or_404(db, chat_id=chat_id, user_id=current_user.id)
    chat_id_value = chat.id
    stored_messages = crud_chat.get_messages(db, chat_id=chat_id_value)
    if not stored_messages or not any(
        message.role == "user" for message in stored_messages
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No user message to regenerate from",
        )
    prompt_messages = (
        stored_messages[:-1]
        if stored_messages[-1].role == "assistant"
        else stored_messages
    )
    messages = [
        {"role": message.role, "content": message.content}
        for message in prompt_messages
        if message.role in {"user", "assistant", "system"}
    ]
    if stored_messages[-1].role == "assistant":
        crud_chat.delete_message(db, message=stored_messages[-1])
    return StreamingResponse(
        _stream_and_persist(db, chat_id=chat_id_value, messages=messages),
        media_type="text/event-stream",
    )
