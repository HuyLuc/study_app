from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserProfileResponse(BaseModel):
    user_id: UUID
    total_xp: int
    level: int
    title: str
    next_level: int
    xp_for_next_level: int


class LeaderboardEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    total_xp: int
    level: int
    title: str


class StreakResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    current_streak: int
    longest_streak: int
    last_activity_date: date | None
    freeze_count: int


class StreakCalendarItemResponse(BaseModel):
    date: date
    sessions: int


class RewardItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    type: str
    rarity: str
    value: int
    probability_weight: int


class RewardHistoryResponse(BaseModel):
    id: UUID
    user_id: UUID
    reward_id: UUID
    reward_name: str
    reward_type: str
    rarity: str
    value: int
    source_session_id: UUID
    received_at: datetime


class BadgeResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    icon: str | None
    condition_type: str
    condition_value: int
    unlocked_at: datetime


class BadgeProgressResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    icon: str | None
    condition_type: str
    condition_value: int
    is_unlocked: bool
    unlocked_at: datetime | None


class LeaderboardQuery(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
