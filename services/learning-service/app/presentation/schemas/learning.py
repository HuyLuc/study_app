from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SkillCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    target_hours: int = Field(default=20, ge=1, le=2000)


class SkillUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    target_hours: int | None = Field(default=None, ge=1, le=2000)
    status: str | None = Field(default=None, pattern="^(active|completed|paused)$")


class SkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    name: str
    description: str | None
    target_hours: int
    total_hours_logged: float
    status: str
    created_at: datetime


class SubSkillCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    is_core: bool = False
    order_index: int = 0


class SubSkillUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    is_core: bool | None = None
    order_index: int | None = None


class SubSkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    skill_id: UUID
    name: str
    is_core: bool
    order_index: int


class TaskCreateRequest(BaseModel):
    sub_skill_id: UUID
    title: str = Field(min_length=1, max_length=300)
    estimated_minutes: int = Field(default=5, ge=1, le=180)


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sub_skill_id: UUID
    title: str
    estimated_minutes: int
    is_micro_task: bool
    is_completed: bool


class CommitmentCreateRequest(BaseModel):
    target_hours: int = Field(default=5, ge=1, le=100)


class CommitmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    skill_id: UUID
    committed_at: datetime | None
    target_hours: int
    hours_completed: float
    status: str


class SessionStartRequest(BaseModel):
    skill_id: UUID
    task_id: UUID | None = None
    focus_duration: int = Field(default=50, ge=1, le=240)
    break_duration: int = Field(default=10, ge=1, le=120)


class PomodoroLogRequest(BaseModel):
    type: str = Field(pattern="^(focus|break)$")
    started_at: datetime
    ended_at: datetime | None = None
    completed: bool = False


class SessionEndRequest(BaseModel):
    ended_at: datetime | None = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    skill_id: UUID
    task_id: UUID | None
    started_at: datetime
    ended_at: datetime | None
    pomodoros_completed: int
    total_focus_minutes: float
    focus_duration: int
    break_duration: int
    status: str
