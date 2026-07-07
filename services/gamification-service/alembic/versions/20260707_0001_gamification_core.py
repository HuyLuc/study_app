"""gamification core tables

Revision ID: 20260707_0001_gamification
Revises:
Create Date: 2026-07-07
"""

from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260707_0001_gamification"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS gamification")

    op.create_table(
        "user_game_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("title", sa.String(length=100), nullable=False, server_default="Nguoi moi bat dau"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", name="uq_gamification_user_game_profiles_user_id"),
        schema="gamification",
    )
    op.create_index("ix_gamification_user_game_profiles_user_id", "user_game_profiles", ["user_id"], schema="gamification")

    op.create_table(
        "user_streaks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_activity_date", sa.Date(), nullable=True),
        sa.Column("freeze_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", name="uq_gamification_user_streaks_user_id"),
        schema="gamification",
    )
    op.create_index("ix_gamification_user_streaks_user_id", "user_streaks", ["user_id"], schema="gamification")

    op.create_table(
        "reward_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("rarity", sa.String(length=20), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("probability_weight", sa.Integer(), nullable=False, server_default="60"),
        schema="gamification",
    )

    op.create_table(
        "badges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=100), nullable=True),
        sa.Column("condition_type", sa.String(length=50), nullable=False),
        sa.Column("condition_value", sa.Integer(), nullable=False),
        sa.UniqueConstraint("name", name="uq_gamification_badges_name"),
        schema="gamification",
    )

    op.create_table(
        "user_reward_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reward_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("source_session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["reward_id"], ["gamification.reward_items.id"]),
        sa.UniqueConstraint("user_id", "source_session_id", name="uq_gamification_reward_user_session"),
        schema="gamification",
    )
    op.create_index("ix_gamification_user_reward_history_user_id", "user_reward_history", ["user_id"], schema="gamification")

    op.create_table(
        "user_badges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("badge_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["badge_id"], ["gamification.badges.id"]),
        sa.UniqueConstraint("user_id", "badge_id", name="uq_gamification_user_badge"),
        schema="gamification",
    )
    op.create_index("ix_gamification_user_badges_user_id", "user_badges", ["user_id"], schema="gamification")

    op.create_table(
        "processed_session_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("session_id", name="uq_gamification_processed_session_id"),
        schema="gamification",
    )
    op.create_index("ix_gamification_processed_session_events_user_id", "processed_session_events", ["user_id"], schema="gamification")

    reward_items = sa.table(
        "reward_items",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("type", sa.String),
        sa.column("rarity", sa.String),
        sa.column("value", sa.Integer),
        sa.column("probability_weight", sa.Integer),
        schema="gamification",
    )
    op.bulk_insert(
        reward_items,
        [
            {
                "id": uuid.UUID("cf3cc78a-5532-48ca-a4dc-46120be4b101"),
                "name": "XP Boost 20",
                "type": "xp_bonus",
                "rarity": "common",
                "value": 20,
                "probability_weight": 45,
            },
            {
                "id": uuid.UUID("b64fb776-0228-4d95-a492-cf76f5c46c8f"),
                "name": "XP Boost 50",
                "type": "xp_bonus",
                "rarity": "rare",
                "value": 50,
                "probability_weight": 20,
            },
            {
                "id": uuid.UUID("7d07f669-9718-4e68-a218-89e44dbca209"),
                "name": "Streak Freeze",
                "type": "streak_freeze",
                "rarity": "rare",
                "value": 1,
                "probability_weight": 5,
            },
            {
                "id": uuid.UUID("839721ba-703d-4b2f-b510-6e72bb404d7c"),
                "name": "Lucky Double XP",
                "type": "lucky",
                "rarity": "epic",
                "value": 0,
                "probability_weight": 12,
            },
            {
                "id": uuid.UUID("8878ec38-20d9-4d18-8c17-591f7ee2a87f"),
                "name": "Badge Shard",
                "type": "badge",
                "rarity": "epic",
                "value": 1,
                "probability_weight": 10,
            },
            {
                "id": uuid.UUID("bd9d34c0-a5de-43cf-a1d8-d8ad6fc9567e"),
                "name": "Legendary XP 150",
                "type": "xp_bonus",
                "rarity": "legendary",
                "value": 150,
                "probability_weight": 3,
            },
            {
                "id": uuid.UUID("0c070404-e0f8-4779-a495-7e5db8db2f82"),
                "name": "Cosmetic Theme",
                "type": "cosmetic",
                "rarity": "common",
                "value": 0,
                "probability_weight": 5,
            },
        ],
    )

    badges = sa.table(
        "badges",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("icon", sa.String),
        sa.column("condition_type", sa.String),
        sa.column("condition_value", sa.Integer),
        schema="gamification",
    )
    op.bulk_insert(
        badges,
        [
            {
                "id": uuid.UUID("6db37faa-9ffc-4b63-b17d-e4f8e4aef5dd"),
                "name": "Khoi dau",
                "description": "Hoan thanh phien hoc dau tien",
                "icon": "spark",
                "condition_type": "sessions_count",
                "condition_value": 1,
            },
            {
                "id": uuid.UUID("5301bfb9-5f40-4676-9773-78f6a4fdd6d4"),
                "name": "Kien tri 7 ngay",
                "description": "Streak 7 ngay lien tuc",
                "icon": "flame",
                "condition_type": "streak_days",
                "condition_value": 7,
            },
            {
                "id": uuid.UUID("40f69772-7744-4a47-99eb-0fda2d587a17"),
                "name": "Vuot thung lung",
                "description": "Hoan thanh 5 gio cam ket",
                "icon": "mountain",
                "condition_type": "commitment_hours",
                "condition_value": 5,
            },
            {
                "id": uuid.UUID("9f1f13cb-5943-43b6-9f77-67734dd9698f"),
                "name": "Tham tu ky uc",
                "description": "Tao 20 flashcards",
                "icon": "memory",
                "condition_type": "flashcards_count",
                "condition_value": 20,
            },
            {
                "id": uuid.UUID("edc0bf58-f4a8-4244-95bf-a64d4d7f862a"),
                "name": "Nha phan tich",
                "description": "Viet 10 error journal entries",
                "icon": "journal",
                "condition_type": "journal_count",
                "condition_value": 10,
            },
            {
                "id": uuid.UUID("ae0e0477-1b41-4777-b635-2e6f8f8b9744"),
                "name": "Chinh phuc 20 gio",
                "description": "Dat du 20 gio cho 1 ky nang",
                "icon": "target",
                "condition_type": "skill_hours",
                "condition_value": 20,
            },
            {
                "id": uuid.UUID("35f5388d-c57a-4eb6-a722-30b4043d9491"),
                "name": "Huyen thoai",
                "description": "Streak 100 ngay",
                "icon": "crown",
                "condition_type": "streak_days",
                "condition_value": 100,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_gamification_processed_session_events_user_id", table_name="processed_session_events", schema="gamification")
    op.drop_table("processed_session_events", schema="gamification")

    op.drop_index("ix_gamification_user_badges_user_id", table_name="user_badges", schema="gamification")
    op.drop_table("user_badges", schema="gamification")

    op.drop_index("ix_gamification_user_reward_history_user_id", table_name="user_reward_history", schema="gamification")
    op.drop_table("user_reward_history", schema="gamification")

    op.drop_table("badges", schema="gamification")
    op.drop_table("reward_items", schema="gamification")

    op.drop_index("ix_gamification_user_streaks_user_id", table_name="user_streaks", schema="gamification")
    op.drop_table("user_streaks", schema="gamification")

    op.drop_index("ix_gamification_user_game_profiles_user_id", table_name="user_game_profiles", schema="gamification")
    op.drop_table("user_game_profiles", schema="gamification")
