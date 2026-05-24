from uuid import UUID

from sqlmodel import Session, select

from app.models.chat import Chat, ChatMessage


def get_chat(db: Session, *, chat_id: UUID, user_id: UUID) -> Chat | None:
    statement = select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id)
    return db.exec(statement).first()


def get_chats(db: Session, *, user_id: UUID) -> list[Chat]:
    statement = (
        select(Chat)
        .where(Chat.user_id == user_id)
        .order_by(Chat.modified.desc(), Chat.created.desc())
    )
    return list(db.exec(statement).all())


def get_messages(db: Session, *, chat_id: UUID) -> list[ChatMessage]:
    statement = (
        select(ChatMessage)
        .where(ChatMessage.chat_id == chat_id)
        .order_by(ChatMessage.created, ChatMessage.id)
    )
    return list(db.exec(statement).all())


def create_chat(db: Session, *, user_id: UUID, title: str | None = None) -> Chat:
    chat = Chat(user_id=user_id, title=title or "Untitled")
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def update_chat_title(db: Session, *, chat: Chat, title: str) -> Chat:
    chat.title = title.strip()
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def delete_chat(db: Session, *, chat: Chat) -> None:
    db.delete(chat)
    db.commit()


def create_message(
    db: Session,
    *,
    chat_id: UUID,
    role: str,
    content: str,
) -> ChatMessage:
    message = ChatMessage(chat_id=chat_id, role=role, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def delete_message(db: Session, *, message: ChatMessage) -> None:
    db.delete(message)
    db.commit()
