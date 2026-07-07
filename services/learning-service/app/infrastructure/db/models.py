from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class SkillModel(Base):
    __tablename__ = "skills"
    __table_args__ = {"schema": "learning"}

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    total_hours_logged: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class SubSkillModel(Base):
    __tablename__ = "sub_skills"
    __table_args__ = {"schema": "learning"}

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    skill_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("learning.skills.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_core: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class LearningTaskModel(Base):
    __tablename__ = "learning_tasks"
    __table_args__ = {"schema": "learning"}

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    sub_skill_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("learning.sub_skills.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    is_micro_task: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class SkillCommitmentModel(Base):
    __tablename__ = "skill_commitments"
    __table_args__ = (UniqueConstraint("user_id", "skill_id", name="uq_learning_skill_commitment_user_skill"), {"schema": "learning"})

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    skill_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("learning.skills.id", ondelete="CASCADE"), nullable=False)
    committed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    target_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    hours_completed: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="committed")


class StudySessionModel(Base):
    __tablename__ = "study_sessions"
    __table_args__ = {"schema": "learning"}

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    skill_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("learning.skills.id"), nullable=False)
    task_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("learning.learning_tasks.id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pomodoros_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_focus_minutes: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    focus_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    break_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")


class PomodoroLogModel(Base):
    __tablename__ = "pomodoro_logs"
    __table_args__ = {"schema": "learning"}

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("learning.study_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
