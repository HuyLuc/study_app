from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from zoneinfo import ZoneInfo

from app.application.use_cases.notification_use_cases import NotificationUseCases
from app.infrastructure.messaging.event_publisher import EventPublisher


class StreakAtRiskScheduler:
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
            id="notification_streak_at_risk_job",
            replace_existing=True,
            coalesce=True,
            max_instances=1,
        )
        self.scheduler.start()
        self._started = True

    async def _run_daily_job(self) -> None:
        async with self.session_factory() as session:
            use_cases = NotificationUseCases(session)
            await use_cases.publish_streak_at_risk_events(self.event_publisher)

    def shutdown(self) -> None:
        if self._started:
            self.scheduler.shutdown(wait=False)
            self._started = False
