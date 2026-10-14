"""Upgrade authentication storage to fastapi-myauth 1.6.

Existing refresh sessions are revoked; users must log in again.
Revision ID: a16_sessions
Revises: 66160a9ae8d8
"""

import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op

revision = "a16_sessions"
down_revision = "66160a9ae8d8"
branch_labels = None
depends_on = None

LEGACY_TIMESTAMPS = {
    "user": ("created", "modified"),
    "socialaccount": ("created",),
    "passkeycredential": ("created", "modified"),
    "passkeyceremony": ("created", "expires_at"),
}


def upgrade():
    if op.get_bind().dialect.name == "postgresql":
        for table, columns in LEGACY_TIMESTAMPS.items():
            for column in columns:
                op.alter_column(
                    table,
                    column,
                    type_=sa.DateTime(timezone=True),
                    existing_type=sa.DateTime(),
                    existing_nullable=False,
                    postgresql_using=f"\"{column}\" AT TIME ZONE 'UTC'",
                )
    op.add_column(
        "user",
        sa.Column("session_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "socialaccount",
        sa.Column(
            "requires_relink", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.execute(
        sa.text(
            'UPDATE socialaccount SET requires_relink = TRUE WHERE user_id IN (SELECT id FROM "user" WHERE email_validated = FALSE)'
        )
    )

    # Legacy bearer tokens lack the new session claims and cannot be reused.
    op.drop_table("refreshtoken")
    op.create_table(
        "refreshtoken",
        sa.Column(
            "token_hash", sqlmodel.sql.sqltypes.AutoString(length=64), primary_key=True
        ),
        sa.Column(
            "authenticates_id", sa.Uuid(), sa.ForeignKey("user.id"), nullable=False
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_refreshtoken_authenticates_id", "refreshtoken", ["authenticates_id"]
    )
    op.create_index("ix_refreshtoken_expires_at", "refreshtoken", ["expires_at"])
    op.create_table(
        "loginchallenge",
        sa.Column("fingerprint", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("purpose", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("session_version", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_loginchallenge_user_id", "loginchallenge", ["user_id"])
    op.create_index("ix_loginchallenge_expires_at", "loginchallenge", ["expires_at"])
    op.create_table(
        "totprecoverycode",
        sa.Column(
            "code_hash", sqlmodel.sql.sqltypes.AutoString(length=64), primary_key=True
        ),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("created", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_totprecoverycode_user_id", "totprecoverycode", ["user_id"])
    # Pending passkey ceremonies must also be requested again after the upgrade.
    op.execute(sa.text("DELETE FROM passkeyceremony"))


def downgrade():
    if op.get_bind().dialect.name == "postgresql":
        for table, columns in LEGACY_TIMESTAMPS.items():
            for column in columns:
                op.alter_column(
                    table,
                    column,
                    type_=sa.DateTime(),
                    existing_type=sa.DateTime(timezone=True),
                    existing_nullable=False,
                    postgresql_using=f"\"{column}\" AT TIME ZONE 'UTC'",
                )
    op.drop_table("totprecoverycode")
    op.drop_table("loginchallenge")
    op.drop_table("refreshtoken")
    op.create_table(
        "refreshtoken",
        sa.Column("token", sqlmodel.sql.sqltypes.AutoString(), primary_key=True),
        sa.Column(
            "authenticates_id", sa.Uuid(), sa.ForeignKey("user.id"), nullable=False
        ),
    )
    op.drop_column("socialaccount", "requires_relink")
    op.drop_column("user", "session_version")
