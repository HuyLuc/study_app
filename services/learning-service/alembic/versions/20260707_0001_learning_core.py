"""learning core tables

Revision ID: 20260707_0001_learning
Revises:
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260707_0001_learning"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS learning")

    op.create_table(
        "skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_hours", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("total_hours_logged", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="learning",
    )

    op.create_table(
        "sub_skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("is_core", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["skill_id"], ["learning.skills.id"], ondelete="CASCADE"),
        schema="learning",
    )

    op.create_table(
        "learning_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("sub_skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("is_micro_task", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["sub_skill_id"], ["learning.sub_skills.id"], ondelete="CASCADE"),
        schema="learning",
    )

    op.create_table(
        "skill_commitments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("committed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("target_hours", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("hours_completed", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="committed"),
        sa.ForeignKeyConstraint(["skill_id"], ["learning.skills.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "skill_id", name="uq_learning_skill_commitment_user_skill"),
        schema="learning",
    )

    op.create_table(
        "study_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pomodoros_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_focus_minutes", sa.Float(), nullable=False, server_default="0"),
        sa.Column("focus_duration", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("break_duration", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.ForeignKeyConstraint(["skill_id"], ["learning.skills.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["learning.learning_tasks.id"]),
        schema="learning",
    )

    op.create_table(
        "pomodoro_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=10), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["session_id"], ["learning.study_sessions.id"], ondelete="CASCADE"),
        schema="learning",
    )


def downgrade() -> None:
    op.drop_table("pomodoro_logs", schema="learning")
    op.drop_table("study_sessions", schema="learning")
    op.drop_table("skill_commitments", schema="learning")
    op.drop_table("learning_tasks", schema="learning")
    op.drop_table("sub_skills", schema="learning")
    op.drop_table("skills", schema="learning")
