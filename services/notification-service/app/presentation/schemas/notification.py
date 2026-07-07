from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


NotificationType = Literal[
    "session_completed",
    "streak_at_risk",
    "badge_unlocked",
    "reward_granted",
    "level_up",
]
ChannelType = Literal["in_app", "email", "push"]


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    type: NotificationType
    title: str
    body: str | None
    is_read: bool
    created_at: datetime


class MarkAllReadResponse(BaseModel):
    updated_count: int


class NotificationPreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    channel: ChannelType
    type: NotificationType
    enabled: bool


class NotificationPreferenceUpdateItem(BaseModel):
    channel: ChannelType
    type: NotificationType
    enabled: bool


class NotificationPreferenceUpdateRequest(BaseModel):
    preferences: list[NotificationPreferenceUpdateItem] = Field(default_factory=list)
