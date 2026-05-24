"""add chat tables

Revision ID: 20260524_add_chat
Revises: 34678308c998
Create Date: 2026-05-24 00:00:00.000000

"""

import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op


revision = "20260524_add_chat"
down_revision = "34678308c998"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "chat",
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("created", sa.DateTime(), nullable=False),
        sa.Column("modified", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_chat_created"), "chat", ["created"], unique=False)
    op.create_index(op.f("ix_chat_user_id"), "chat", ["user_id"], unique=False)
    op.create_table(
        "chatmessage",
        sa.Column("role", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("content", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("chat_id", sa.Uuid(), nullable=False),
        sa.Column("created", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["chat_id"], ["chat.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_chatmessage_chat_id"), "chatmessage", ["chat_id"], unique=False
    )
    op.create_index(
        op.f("ix_chatmessage_created"), "chatmessage", ["created"], unique=False
    )


def downgrade():
    op.drop_index(op.f("ix_chatmessage_created"), table_name="chatmessage")
    op.drop_index(op.f("ix_chatmessage_chat_id"), table_name="chatmessage")
    op.drop_table("chatmessage")
    op.drop_index(op.f("ix_chat_user_id"), table_name="chat")
    op.drop_index(op.f("ix_chat_created"), table_name="chat")
    op.drop_table("chat")
