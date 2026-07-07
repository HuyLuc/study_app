from __future__ import annotations

from pydantic import BaseModel


class SessionCompletedEvent(BaseModel):
    event_type: str = "session.completed"
    user_id: str
    session_id: str
    skill_id: str
    total_focus_minutes: float
    pomodoros_completed: int
    completed_at: str


class StreakAtRiskEvent(BaseModel):
    event_type: str = "streak.at_risk"
    user_id: str
    current_streak: int
    last_activity_date: str


class BadgeUnlockedEvent(BaseModel):
    event_type: str = "badge.unlocked"
    user_id: str
    badge_id: str
    badge_name: str
    unlocked_at: str


class RewardGrantedEvent(BaseModel):
    event_type: str = "reward.granted"
    user_id: str
    reward_name: str
    rarity: str
    value: int
    source_session_id: str


class LevelUpEvent(BaseModel):
    event_type: str = "level.up"
    user_id: str
    old_level: int
    new_level: int
    new_title: str
