from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class ChatBase(SQLModel):
    title: str = Field(default="Untitled", max_length=120)


class Chat(ChatBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True, nullable=False)
    created: datetime = Field(
        default_factory=datetime.utcnow, nullable=False, index=True
    )
    modified: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
    messages: list["ChatMessage"] = Relationship(
        back_populates="chat",
        cascade_delete=True,
    )


class ChatMessageBase(SQLModel):
    role: str
    content: str


class ChatMessage(ChatMessageBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    chat_id: UUID = Field(foreign_key="chat.id", index=True, nullable=False)
    created: datetime = Field(
        default_factory=datetime.utcnow, nullable=False, index=True
    )
    chat: Chat | None = Relationship(back_populates="messages")


class ChatCreate(SQLModel):
    title: str | None = Field(default=None, max_length=120)


class ChatUpdate(SQLModel):
    title: str = Field(min_length=1, max_length=120)


class ChatMessageCreate(SQLModel):
    content: str = Field(min_length=1, max_length=20000)


class ChatMessageRead(ChatMessageBase):
    id: UUID
    chat_id: UUID
    created: datetime


class ChatSummary(ChatBase):
    id: UUID
    created: datetime
    modified: datetime


class ChatRead(ChatSummary):
    messages: list[ChatMessageRead] = []
