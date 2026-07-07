"""learning flashcards and journal tables

Revision ID: 20260707_0002_learning
Revises: 20260707_0001_learning
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260707_0002_learning"
down_revision = "20260707_0001_learning"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "flashcards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("front", sa.Text(), nullable=False),
        sa.Column("back", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["skill_id"], ["learning.skills.id"], ondelete="CASCADE"),
        schema="learning",
    )
    op.create_index("ix_learning_flashcards_user_id", "flashcards", ["user_id"], schema="learning")
    op.create_index("ix_learning_flashcards_skill_id", "flashcards", ["skill_id"], schema="learning")

    op.create_table(
        "flashcard_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("card_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("difficulty", sa.Integer(), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("easiness_factor", sa.Float(), nullable=False, server_default="2.5"),
        sa.Column("repetitions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_review_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("difficulty BETWEEN 1 AND 5", name="ck_learning_flashcard_reviews_difficulty"),
        sa.ForeignKeyConstraint(["card_id"], ["learning.flashcards.id"], ondelete="CASCADE"),
        schema="learning",
    )
    op.create_index("ix_learning_flashcard_reviews_card_id", "flashcard_reviews", ["card_id"], schema="learning")
    op.create_index("ix_learning_flashcard_reviews_next_review_at", "flashcard_reviews", ["next_review_at"], schema="learning")

    op.create_table(
        "error_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("lesson_learned", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["session_id"], ["learning.study_sessions.id"]),
        sa.ForeignKeyConstraint(["skill_id"], ["learning.skills.id"], ondelete="CASCADE"),
        schema="learning",
    )
    op.create_index("ix_learning_error_entries_user_id", "error_entries", ["user_id"], schema="learning")
    op.create_index("ix_learning_error_entries_skill_id", "error_entries", ["skill_id"], schema="learning")


def downgrade() -> None:
    op.drop_index("ix_learning_error_entries_skill_id", table_name="error_entries", schema="learning")
    op.drop_index("ix_learning_error_entries_user_id", table_name="error_entries", schema="learning")
    op.drop_table("error_entries", schema="learning")

    op.drop_index("ix_learning_flashcard_reviews_next_review_at", table_name="flashcard_reviews", schema="learning")
    op.drop_index("ix_learning_flashcard_reviews_card_id", table_name="flashcard_reviews", schema="learning")
    op.drop_table("flashcard_reviews", schema="learning")

    op.drop_index("ix_learning_flashcards_skill_id", table_name="flashcards", schema="learning")
    op.drop_index("ix_learning_flashcards_user_id", table_name="flashcards", schema="learning")
    op.drop_table("flashcards", schema="learning")
