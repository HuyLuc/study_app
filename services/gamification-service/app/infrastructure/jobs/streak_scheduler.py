from __future__ import annotations

from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from zoneinfo import ZoneInfo

from app.infrastructure.db.models import UserStreakModel
from app.infrastructure.messaging.event_publisher import EventPublisher


class StreakAtRiskScheduler:
    ICT = timezone(timedelta(hours=7))

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        event_publisher: EventPublisher,
        timezone_name: str = "Asia/Ho_Chi_Minh",
    ):
        self.session_factory = session_factory
        self.event_publisher = event_publisher
        self.timezone = ZoneInfo(timezone_name)
        self.scheduler = AsyncIOScheduler(timezone=self.timezone)
        self._started = False

    def start(self) -> None:
        trigger = CronTrigger(hour=20, minute=0, timezone=self.timezone)
        self.scheduler.add_job(
            self._run_daily_job,
            trigger=trigger,
            id="gamification_streak_at_risk_job",
            replace_existing=True,
            coalesce=True,
            max_instances=1,
        )
        self.scheduler.start()
        self._started = True

    async def _run_daily_job(self) -> None:
        today_ict = datetime.now(self.ICT).date()
        async with self.session_factory() as session:
            stmt = select(UserStreakModel).where(
                UserStreakModel.current_streak > 0,
                (UserStreakModel.last_activity_date.is_(None) | (UserStreakModel.last_activity_date < today_ict))
            )
            result = await session.execute(stmt)
            streaks = result.scalars().all()

            for streak in streaks:
                await self.event_publisher.publish(
                    routing_key="streak.at_risk",
                    payload={
                        "event_type": "streak.at_risk",
                        "user_id": str(streak.user_id),
                        "current_streak": int(streak.current_streak),
                        "last_activity_date": streak.last_activity_date.isoformat() if streak.last_activity_date else "",
                    },
                )

    def shutdown(self) -> None:
        if self._started:
            self.scheduler.shutdown(wait=False)
            self._started = False
