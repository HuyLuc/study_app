from __future__ import annotations

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class UserGameProfileModel(Base):
    __tablename__ = "user_game_profiles"
    __table_args__ = {"schema": "gamification"}

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True, index=True)
    total_xp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(100), nullable=False, default="Nguoi moi bat dau")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class UserStreakModel(Base):
    __tablename__ = "user_streaks"
    __table_args__ = {"schema": "gamification"}

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True, index=True)
    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    freeze_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class RewardItemModel(Base):
    __tablename__ = "reward_items"
    __table_args__ = {"schema": "gamification"}

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    rarity: Mapped[str] = mapped_column(String(20), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    probability_weight: Mapped[int] = mapped_column(Integer, nullable=False, default=60)


class UserRewardHistoryModel(Base):
    __tablename__ = "user_reward_history"
    __table_args__ = (
        UniqueConstraint("user_id", "source_session_id", name="uq_gamification_reward_user_session"),
        {"schema": "gamification"},
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    reward_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("gamification.reward_items.id"), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    source_session_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)


class BadgeModel(Base):
    __tablename__ = "badges"
    __table_args__ = {"schema": "gamification"}

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)
    condition_type: Mapped[str] = mapped_column(String(50), nullable=False)
    condition_value: Mapped[int] = mapped_column(Integer, nullable=False)


class UserBadgeModel(Base):
    __tablename__ = "user_badges"
    __table_args__ = (
        UniqueConstraint("user_id", "badge_id", name="uq_gamification_user_badge"),
        {"schema": "gamification"},
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    badge_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("gamification.badges.id"), nullable=False)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ProcessedSessionEventModel(Base):
    __tablename__ = "processed_session_events"
    __table_args__ = {"schema": "gamification"}

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    session_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True)
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
