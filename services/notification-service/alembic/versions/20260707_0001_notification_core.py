"""notification core tables

Revision ID: 20260707_0001_notification
Revises:
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260707_0001_notification"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS notification")

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="notification",
    )
    op.create_index(
        "ix_notification_notifications_user_id",
        "notifications",
        ["user_id"],
        schema="notification",
    )
    op.create_index(
        "ix_notification_notifications_user_unread",
        "notifications",
        ["user_id", "is_read"],
        schema="notification",
    )

    op.create_table(
        "notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.UniqueConstraint("user_id", "channel", "type", name="uq_notification_user_channel_type"),
        schema="notification",
    )
    op.create_index(
        "ix_notification_notification_preferences_user_id",
        "notification_preferences",
        ["user_id"],
        schema="notification",
    )

    op.create_table(
        "processed_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("event_key", sa.String(length=128), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("event_key", name="uq_notification_processed_event_key"),
        schema="notification",
    )
    op.create_index(
        "ix_notification_processed_events_user_id",
        "processed_events",
        ["user_id"],
        schema="notification",
    )


def downgrade() -> None:
    op.drop_index("ix_notification_processed_events_user_id", table_name="processed_events", schema="notification")
    op.drop_table("processed_events", schema="notification")

    op.drop_index(
        "ix_notification_notification_preferences_user_id",
        table_name="notification_preferences",
        schema="notification",
    )
    op.drop_table("notification_preferences", schema="notification")

    op.drop_index("ix_notification_notifications_user_unread", table_name="notifications", schema="notification")
    op.drop_index("ix_notification_notifications_user_id", table_name="notifications", schema="notification")
    op.drop_table("notifications", schema="notification")
