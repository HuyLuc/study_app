from __future__ import annotations

from datetime import datetime, timedelta, timezone
import random
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.models import (
    BadgeModel,
    ProcessedSessionEventModel,
    RewardItemModel,
    UserBadgeModel,
    UserGameProfileModel,
    UserRewardHistoryModel,
    UserStreakModel,
)
from app.infrastructure.messaging.event_publisher import EventPublisher


class GamificationUseCases:
    ICT = timezone(timedelta(hours=7))
    BASE_SESSION_XP = 30
    POMODORO_XP = 10
    FREEZE_COST_XP = 100

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def handle_session_completed(self, event_payload: dict, event_publisher: EventPublisher) -> dict:
        user_id = UUID(event_payload["user_id"])
        session_id = UUID(event_payload["session_id"])
        completed_at = self._parse_datetime(event_payload["completed_at"])
        pomodoros_completed = int(event_payload.get("pomodoros_completed", 0))
        activity_date = completed_at.astimezone(self.ICT).date()

        if await self._is_session_processed(session_id):
            return {"processed": False, "reason": "duplicate"}

        processed_event = ProcessedSessionEventModel(
            user_id=user_id,
            session_id=session_id,
            activity_date=activity_date,
        )
        self.db_session.add(processed_event)

        try:
            await self.db_session.flush()
        except IntegrityError:
            await self.db_session.rollback()
            return {"processed": False, "reason": "duplicate"}

        profile = await self._get_or_create_profile(user_id)
        streak = await self._get_or_create_streak(user_id)

        old_streak = streak.current_streak
        self._update_streak(streak, activity_date)

        base_xp = self.BASE_SESSION_XP + max(pomodoros_completed, 0) * self.POMODORO_XP
        streak_bonus = self._calculate_streak_milestone_bonus(old_streak, streak.current_streak)

        reward_item = await self._roll_reward(user_id, session_id)
        reward_bonus_xp = 0
        reward_value = 0

        if reward_item:
            if reward_item.type == "xp_bonus":
                reward_bonus_xp += reward_item.value
                reward_value = reward_item.value
            elif reward_item.type == "lucky":
                reward_bonus_xp += base_xp
                reward_value = base_xp
            elif reward_item.type == "streak_freeze":
                streak.freeze_count += 1
                reward_value = 1
            elif reward_item.type == "badge":
                reward_value = 1

            history = UserRewardHistoryModel(
                user_id=user_id,
                reward_id=reward_item.id,
                source_session_id=session_id,
            )
            self.db_session.add(history)

        gained_xp = base_xp + streak_bonus + reward_bonus_xp

        old_level = profile.level
        profile.total_xp += gained_xp
        profile.level = self._calculate_level(profile.total_xp)
        profile.title = self._resolve_title(profile.level)

        unlocked_badges = await self._check_and_unlock_badges(user_id, streak.current_streak)

        await self.db_session.commit()

        if reward_item:
            await event_publisher.publish(
                routing_key="reward.granted",
                payload={
                    "event_type": "reward.granted",
                    "user_id": str(user_id),
                    "reward_name": reward_item.name,
                    "rarity": reward_item.rarity,
                    "value": reward_value,
                    "source_session_id": str(session_id),
                },
            )

        for badge in unlocked_badges:
            await event_publisher.publish(
                routing_key="badge.unlocked",
                payload={
                    "event_type": "badge.unlocked",
                    "user_id": str(user_id),
                    "badge_id": str(badge.id),
                    "badge_name": badge.name,
                    "unlocked_at": datetime.now(timezone.utc).isoformat(),
                },
            )

        if profile.level > old_level:
            await event_publisher.publish(
                routing_key="level.up",
                payload={
                    "event_type": "level.up",
                    "user_id": str(user_id),
                    "old_level": old_level,
                    "new_level": profile.level,
                    "new_title": profile.title,
                },
            )

        return {
            "processed": True,
            "current_streak": streak.current_streak,
            "gained_xp": gained_xp,
            "new_level": profile.level,
            "reward": reward_item.name if reward_item else None,
            "unlocked_badges": [badge.name for badge in unlocked_badges],
        }

    async def get_profile(self, user_id: UUID) -> dict:
        profile = await self._get_or_create_profile(user_id)
        await self.db_session.commit()

        next_level = profile.level + 1
        next_level_threshold = self._cumulative_xp_for_level(next_level)

        return {
            "user_id": profile.user_id,
            "total_xp": profile.total_xp,
            "level": profile.level,
            "title": profile.title,
            "next_level": next_level,
            "xp_for_next_level": max(next_level_threshold - profile.total_xp, 0),
        }

    async def get_leaderboard(self, limit: int) -> list[UserGameProfileModel]:
        stmt: Select[tuple[UserGameProfileModel]] = (
            select(UserGameProfileModel)
            .order_by(UserGameProfileModel.total_xp.desc(), UserGameProfileModel.created_at.asc())
            .limit(limit)
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_streak(self, user_id: UUID) -> UserStreakModel:
        streak = await self._get_or_create_streak(user_id)
        await self.db_session.commit()
        return streak

    async def use_streak_freeze(self, user_id: UUID) -> UserStreakModel:
        profile = await self._get_or_create_profile(user_id)
        streak = await self._get_or_create_streak(user_id)

        if profile.total_xp < self.FREEZE_COST_XP:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not enough XP to buy streak freeze")

        profile.total_xp -= self.FREEZE_COST_XP
        streak.freeze_count += 1

        await self.db_session.commit()
        await self.db_session.refresh(streak)
        return streak

    async def get_streak_calendar(self, user_id: UUID, last_days: int) -> list[dict]:
        start_date = datetime.now(self.ICT).date() - timedelta(days=max(last_days - 1, 0))

        stmt = (
            select(ProcessedSessionEventModel.activity_date, func.count(ProcessedSessionEventModel.id))
            .where(
                ProcessedSessionEventModel.user_id == user_id,
                ProcessedSessionEventModel.activity_date >= start_date,
            )
            .group_by(ProcessedSessionEventModel.activity_date)
            .order_by(ProcessedSessionEventModel.activity_date.asc())
        )
        result = await self.db_session.execute(stmt)

        return [{"date": row[0], "sessions": int(row[1])} for row in result.all()]

    async def list_reward_pool(self) -> list[RewardItemModel]:
        stmt = select(RewardItemModel).order_by(RewardItemModel.probability_weight.desc(), RewardItemModel.name.asc())
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def list_reward_history(self, user_id: UUID) -> list[dict]:
        stmt = (
            select(UserRewardHistoryModel, RewardItemModel)
            .join(RewardItemModel, RewardItemModel.id == UserRewardHistoryModel.reward_id)
            .where(UserRewardHistoryModel.user_id == user_id)
            .order_by(UserRewardHistoryModel.received_at.desc())
        )
        result = await self.db_session.execute(stmt)

        history_items: list[dict] = []
        for history, reward in result.all():
            history_items.append(
                {
                    "id": history.id,
                    "user_id": history.user_id,
                    "reward_id": reward.id,
                    "reward_name": reward.name,
                    "reward_type": reward.type,
                    "rarity": reward.rarity,
                    "value": reward.value,
                    "source_session_id": history.source_session_id,
                    "received_at": history.received_at,
                }
            )

        return history_items

    async def list_user_badges(self, user_id: UUID) -> list[dict]:
        stmt = (
            select(UserBadgeModel, BadgeModel)
            .join(BadgeModel, BadgeModel.id == UserBadgeModel.badge_id)
            .where(UserBadgeModel.user_id == user_id)
            .order_by(UserBadgeModel.unlocked_at.desc())
        )
        result = await self.db_session.execute(stmt)

        badges: list[dict] = []
        for user_badge, badge in result.all():
            badges.append(
                {
                    "id": badge.id,
                    "name": badge.name,
                    "description": badge.description,
                    "icon": badge.icon,
                    "condition_type": badge.condition_type,
                    "condition_value": badge.condition_value,
                    "unlocked_at": user_badge.unlocked_at,
                }
            )

        return badges

    async def list_all_badges(self, user_id: UUID) -> list[dict]:
        unlocked_stmt = select(UserBadgeModel.badge_id, UserBadgeModel.unlocked_at).where(UserBadgeModel.user_id == user_id)
        unlocked_result = await self.db_session.execute(unlocked_stmt)
        unlocked_map = {row[0]: row[1] for row in unlocked_result.all()}

        badges_stmt = select(BadgeModel).order_by(BadgeModel.name.asc())
        badges_result = await self.db_session.execute(badges_stmt)

        all_badges: list[dict] = []
        for badge in badges_result.scalars().all():
            all_badges.append(
                {
                    "id": badge.id,
                    "name": badge.name,
                    "description": badge.description,
                    "icon": badge.icon,
                    "condition_type": badge.condition_type,
                    "condition_value": badge.condition_value,
                    "is_unlocked": badge.id in unlocked_map,
                    "unlocked_at": unlocked_map.get(badge.id),
                }
            )

        return all_badges

    async def _check_and_unlock_badges(self, user_id: UUID, current_streak: int) -> list[BadgeModel]:
        session_count_stmt = select(func.count(ProcessedSessionEventModel.id)).where(ProcessedSessionEventModel.user_id == user_id)
        session_count = int((await self.db_session.execute(session_count_stmt)).scalar_one())

        unlocked_badges_stmt = select(UserBadgeModel.badge_id).where(UserBadgeModel.user_id == user_id)
        unlocked_badges_result = await self.db_session.execute(unlocked_badges_stmt)
        unlocked_badge_ids = {row[0] for row in unlocked_badges_result.all()}

        badges_stmt = select(BadgeModel)
        badges_result = await self.db_session.execute(badges_stmt)

        newly_unlocked: list[BadgeModel] = []

        for badge in badges_result.scalars().all():
            if badge.id in unlocked_badge_ids:
                continue

            eligible = False
            if badge.condition_type == "sessions_count":
                eligible = session_count >= badge.condition_value
            elif badge.condition_type == "streak_days":
                eligible = current_streak >= badge.condition_value

            if not eligible:
                continue

            self.db_session.add(UserBadgeModel(user_id=user_id, badge_id=badge.id))
            newly_unlocked.append(badge)

        await self.db_session.flush()
        return newly_unlocked

    async def _get_or_create_profile(self, user_id: UUID) -> UserGameProfileModel:
        stmt = select(UserGameProfileModel).where(UserGameProfileModel.user_id == user_id)
        result = await self.db_session.execute(stmt)
        profile = result.scalar_one_or_none()

        if profile:
            return profile

        create_stmt = (
            pg_insert(UserGameProfileModel)
            .values(user_id=user_id, total_xp=0, level=1, title=self._resolve_title(1))
            .on_conflict_do_nothing(index_elements=["user_id"])
        )
        await self.db_session.execute(create_stmt)
        result = await self.db_session.execute(stmt)
        profile = result.scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Cannot load user profile")
        return profile

    async def _get_or_create_streak(self, user_id: UUID) -> UserStreakModel:
        stmt = select(UserStreakModel).where(UserStreakModel.user_id == user_id)
        result = await self.db_session.execute(stmt)
        streak = result.scalar_one_or_none()

        if streak:
            return streak

        create_stmt = (
            pg_insert(UserStreakModel)
            .values(user_id=user_id, current_streak=0, longest_streak=0, freeze_count=0)
            .on_conflict_do_nothing(index_elements=["user_id"])
        )
        await self.db_session.execute(create_stmt)
        result = await self.db_session.execute(stmt)
        streak = result.scalar_one_or_none()
        if not streak:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Cannot load user streak")
        return streak

    async def _is_session_processed(self, session_id: UUID) -> bool:
        stmt = select(ProcessedSessionEventModel.id).where(ProcessedSessionEventModel.session_id == session_id)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def _roll_reward(self, user_id: UUID, session_id: UUID) -> RewardItemModel | None:
        rewards_stmt = select(RewardItemModel).where(RewardItemModel.probability_weight > 0)
        rewards_result = await self.db_session.execute(rewards_stmt)
        rewards = list(rewards_result.scalars().all())

        if not rewards:
            return None

        total_weight = sum(item.probability_weight for item in rewards)
        rng = random.Random(f"{user_id}:{session_id}")
        roll = rng.randint(1, total_weight)

        pointer = 0
        for item in rewards:
            pointer += item.probability_weight
            if roll <= pointer:
                return item

        return rewards[-1]

    def _update_streak(self, streak: UserStreakModel, activity_date) -> None:
        last_activity = streak.last_activity_date

        if last_activity is None:
            streak.current_streak = 1
        else:
            gap_days = (activity_date - last_activity).days
            if gap_days <= 0:
                return
            if gap_days == 1:
                streak.current_streak += 1
            elif gap_days == 2 and streak.freeze_count > 0:
                streak.freeze_count -= 1
                streak.current_streak += 1
            else:
                streak.current_streak = 1

        streak.last_activity_date = activity_date
        streak.longest_streak = max(streak.longest_streak, streak.current_streak)

    @staticmethod
    def _calculate_streak_milestone_bonus(old_streak: int, new_streak: int) -> int:
        milestones = {7: 50, 30: 200, 100: 500}
        bonus = 0
        for milestone, xp in milestones.items():
            if old_streak < milestone <= new_streak:
                bonus += xp
        return bonus

    @staticmethod
    def _xp_required_for_next_level(level: int) -> int:
        return level * 100 + (level - 1) * 50

    @classmethod
    def _cumulative_xp_for_level(cls, level: int) -> int:
        if level <= 1:
            return 0

        total = 0
        for current_level in range(1, level):
            total += cls._xp_required_for_next_level(current_level)
        return total

    @classmethod
    def _calculate_level(cls, total_xp: int) -> int:
        level = 1
        while total_xp >= cls._cumulative_xp_for_level(level + 1):
            level += 1
        return level

    @staticmethod
    def _resolve_title(level: int) -> str:
        if level >= 20:
            return "Huyen thoai"
        if level >= 10:
            return "Bac thay hoc tap"
        if level >= 5:
            return "Nguoi hoc ky luat"
        return "Nguoi moi bat dau"

    @staticmethod
    def _parse_datetime(value: str) -> datetime:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
