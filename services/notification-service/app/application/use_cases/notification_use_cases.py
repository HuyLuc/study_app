from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.models import NotificationModel, NotificationPreferenceModel, ProcessedEventModel


class NotificationUseCases:
    CHANNELS = ("in_app", "email", "push")
    NOTIFICATION_TYPES = (
        "session_completed",
        "streak_at_risk",
        "badge_unlocked",
        "reward_granted",
        "level_up",
    )
    EVENT_TO_NOTIFICATION_TYPE = {
        "session.completed": "session_completed",
        "streak.at_risk": "streak_at_risk",
        "badge.unlocked": "badge_unlocked",
        "reward.granted": "reward_granted",
        "level.up": "level_up",
    }
    ICT = timezone(timedelta(hours=7))

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def list_notifications(self, user_id: UUID, unread_only: bool, limit: int, offset: int) -> list[NotificationModel]:
        stmt: Select[tuple[NotificationModel]] = (
            select(NotificationModel)
            .where(NotificationModel.user_id == user_id)
            .order_by(NotificationModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if unread_only:
            stmt = stmt.where(NotificationModel.is_read.is_(False))

        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def mark_read(self, user_id: UUID, notification_id: UUID) -> NotificationModel:
        stmt = select(NotificationModel).where(
            NotificationModel.id == notification_id,
            NotificationModel.user_id == user_id,
        )
        result = await self.db_session.execute(stmt)
        notification = result.scalar_one_or_none()

        if not notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

        if not notification.is_read:
            notification.is_read = True
            await self.db_session.commit()
            await self.db_session.refresh(notification)

        return notification

    async def mark_all_read(self, user_id: UUID) -> int:
        stmt = (
            update(NotificationModel)
            .where(NotificationModel.user_id == user_id, NotificationModel.is_read.is_(False))
            .values(is_read=True)
        )
        result = await self.db_session.execute(stmt)
        await self.db_session.commit()
        return int(result.rowcount or 0)

    async def get_preferences(self, user_id: UUID) -> list[dict]:
        stmt = select(NotificationPreferenceModel).where(NotificationPreferenceModel.user_id == user_id)
        result = await self.db_session.execute(stmt)
        rows = list(result.scalars().all())

        row_map: dict[tuple[str, str], bool] = {
            (item.channel, item.type): item.enabled
            for item in rows
        }

        preferences: list[dict] = []
        for channel in self.CHANNELS:
            for notification_type in self.NOTIFICATION_TYPES:
                preferences.append(
                    {
                        "user_id": user_id,
                        "channel": channel,
                        "type": notification_type,
                        "enabled": row_map.get((channel, notification_type), self._default_enabled(channel)),
                    }
                )

        return preferences

    async def update_preferences(self, user_id: UUID, updates: list) -> list[dict]:
        for item in updates:
            stmt = (
                pg_insert(NotificationPreferenceModel)
                .values(user_id=user_id, channel=item.channel, type=item.type, enabled=item.enabled)
                .on_conflict_do_update(
                    constraint="uq_notification_user_channel_type",
                    set_={"enabled": item.enabled},
                )
            )
            await self.db_session.execute(stmt)

        await self.db_session.commit()
        return await self.get_preferences(user_id)

    async def handle_event(self, event_type: str, payload: dict) -> dict:
        notification_type = self.EVENT_TO_NOTIFICATION_TYPE.get(event_type)
        if not notification_type:
            return {"created": False, "reason": "unsupported_event"}

        user_id_raw = payload.get("user_id")
        if not user_id_raw:
            return {"created": False, "reason": "missing_user_id"}

        try:
            user_id = UUID(str(user_id_raw))
        except ValueError:
            return {"created": False, "reason": "invalid_user_id"}

        enabled = await self._is_enabled(user_id=user_id, channel="in_app", notification_type=notification_type)
        if not enabled:
            return {"created": False, "reason": "preference_disabled"}

        title, body = self._build_notification_content(notification_type, payload)
        event_key = self._build_event_key(event_type, payload)

        dedupe_stmt = (
            pg_insert(ProcessedEventModel)
            .values(event_key=event_key, event_type=event_type, user_id=user_id)
            .on_conflict_do_nothing(index_elements=["event_key"])
            .returning(ProcessedEventModel.id)
        )
        dedupe_result = await self.db_session.execute(dedupe_stmt)
        inserted_id = dedupe_result.scalar_one_or_none()
        if inserted_id is None:
            return {"created": False, "reason": "duplicate"}

        notification = NotificationModel(
            user_id=user_id,
            type=notification_type,
            title=title,
            body=body,
            is_read=False,
        )
        self.db_session.add(notification)
        await self.db_session.commit()
        return {"created": True}

    async def _is_enabled(self, user_id: UUID, channel: str, notification_type: str) -> bool:
        stmt = select(NotificationPreferenceModel).where(
            NotificationPreferenceModel.user_id == user_id,
            NotificationPreferenceModel.channel == channel,
            NotificationPreferenceModel.type == notification_type,
        )
        result = await self.db_session.execute(stmt)
        preference = result.scalar_one_or_none()
        if preference is None:
            return self._default_enabled(channel)
        return preference.enabled

    @staticmethod
    def _default_enabled(channel: str) -> bool:
        return channel == "in_app"

    @staticmethod
    def _build_event_key(event_type: str, payload: dict) -> str:
        canonical_payload = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha256(f"{event_type}:{canonical_payload}".encode("utf-8")).hexdigest()
        return digest

    @staticmethod
    def _build_notification_content(notification_type: str, payload: dict) -> tuple[str, str]:
        if notification_type == "session_completed":
            focus_minutes = float(payload.get("total_focus_minutes", 0))
            title = "Session completed"
            body = f"Great work. You completed a session with {focus_minutes:.1f} focus minutes."
            return title, body

        if notification_type == "streak_at_risk":
            current_streak = int(payload.get("current_streak", 0))
            title = "Streak at risk"
            body = f"Your {current_streak}-day streak is at risk. Study today to keep it."
            return title, body

        if notification_type == "badge_unlocked":
            badge_name = str(payload.get("badge_name", "New badge"))
            title = f"Badge unlocked: {badge_name}"
            body = "You unlocked a new achievement."
            return title, body

        if notification_type == "reward_granted":
            reward_name = str(payload.get("reward_name", "Reward"))
            rarity = str(payload.get("rarity", "common"))
            title = f"Reward granted: {reward_name}"
            body = f"You received a {rarity} reward."
            return title, body

        if notification_type == "level_up":
            new_level = int(payload.get("new_level", 1))
            title = f"Level up to {new_level}"
            body = "Keep the momentum going."
            return title, body

        return "Notification", "You have a new notification."
