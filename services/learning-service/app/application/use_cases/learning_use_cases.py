from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.infrastructure.db.models import (
    ErrorEntryModel,
    FlashcardModel,
    FlashcardReviewModel,
    LearningTaskModel,
    PomodoroLogModel,
    SkillCommitmentModel,
    SkillModel,
    StudySessionModel,
    SubSkillModel,
)
from app.infrastructure.messaging.event_publisher import EventPublisher


class LearningUseCases:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def create_skill(self, user_id: UUID, name: str, description: str | None, target_hours: int) -> SkillModel:
        skill = SkillModel(
            user_id=user_id,
            name=name,
            description=description,
            target_hours=target_hours,
            status="active",
        )
        self.db_session.add(skill)
        await self.db_session.commit()
        await self.db_session.refresh(skill)
        return skill

    async def list_skills(self, user_id: UUID) -> list[SkillModel]:
        stmt: Select[tuple[SkillModel]] = select(SkillModel).where(SkillModel.user_id == user_id).order_by(SkillModel.created_at.desc())
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_skill(self, user_id: UUID, skill_id: UUID) -> SkillModel:
        skill = await self._get_skill_owned(user_id, skill_id)
        if not skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
        return skill

    async def update_skill(
        self,
        user_id: UUID,
        skill_id: UUID,
        name: str | None,
        description: str | None,
        target_hours: int | None,
        status_text: str | None,
    ) -> SkillModel:
        skill = await self.get_skill(user_id, skill_id)

        if name is not None:
            skill.name = name
        if description is not None:
            skill.description = description
        if target_hours is not None:
            skill.target_hours = target_hours
        if status_text is not None:
            skill.status = status_text

        await self.db_session.commit()
        await self.db_session.refresh(skill)
        return skill

    async def create_sub_skill(
        self,
        user_id: UUID,
        skill_id: UUID,
        name: str,
        is_core: bool,
        order_index: int,
    ) -> SubSkillModel:
        await self.get_skill(user_id, skill_id)

        sub_skill = SubSkillModel(
            skill_id=skill_id,
            name=name,
            is_core=is_core,
            order_index=order_index,
        )
        self.db_session.add(sub_skill)
        await self.db_session.commit()
        await self.db_session.refresh(sub_skill)
        return sub_skill

    async def update_sub_skill(
        self,
        user_id: UUID,
        skill_id: UUID,
        sub_skill_id: UUID,
        name: str | None,
        is_core: bool | None,
        order_index: int | None,
    ) -> SubSkillModel:
        await self.get_skill(user_id, skill_id)

        sub_skill = await self._get_sub_skill(skill_id, sub_skill_id)
        if not sub_skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sub-skill not found")

        if name is not None:
            sub_skill.name = name
        if is_core is not None:
            sub_skill.is_core = is_core
        if order_index is not None:
            sub_skill.order_index = order_index

        await self.db_session.commit()
        await self.db_session.refresh(sub_skill)
        return sub_skill

    async def create_task(
        self,
        user_id: UUID,
        skill_id: UUID,
        sub_skill_id: UUID,
        title: str,
        estimated_minutes: int,
    ) -> LearningTaskModel:
        await self.get_skill(user_id, skill_id)

        sub_skill = await self._get_sub_skill(skill_id, sub_skill_id)
        if not sub_skill:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sub-skill does not belong to skill")

        task = LearningTaskModel(
            sub_skill_id=sub_skill_id,
            title=title,
            estimated_minutes=estimated_minutes,
            is_micro_task=estimated_minutes <= 5,
            is_completed=False,
        )
        self.db_session.add(task)
        await self.db_session.commit()
        await self.db_session.refresh(task)
        return task

    async def create_commitment(self, user_id: UUID, skill_id: UUID, target_hours: int) -> SkillCommitmentModel:
        await self.get_skill(user_id, skill_id)

        existing = await self._get_commitment(user_id, skill_id)
        if existing and existing.status != "abandoned":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Commitment already exists")

        if existing and existing.status == "abandoned":
            existing.target_hours = target_hours
            existing.status = "committed"
            existing.hours_completed = 0
            existing.committed_at = datetime.now(timezone.utc)
            await self.db_session.commit()
            await self.db_session.refresh(existing)
            return existing

        commitment = SkillCommitmentModel(
            user_id=user_id,
            skill_id=skill_id,
            target_hours=target_hours,
            status="committed",
            hours_completed=0,
            committed_at=datetime.now(timezone.utc),
        )
        self.db_session.add(commitment)
        await self.db_session.commit()
        await self.db_session.refresh(commitment)
        return commitment

    async def get_commitment(self, user_id: UUID, skill_id: UUID) -> SkillCommitmentModel:
        commitment = await self._get_commitment(user_id, skill_id)
        if not commitment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commitment not found")
        return commitment

    async def abandon_commitment(self, user_id: UUID, skill_id: UUID) -> SkillCommitmentModel:
        commitment = await self.get_commitment(user_id, skill_id)
        commitment.status = "abandoned"
        await self.db_session.commit()
        await self.db_session.refresh(commitment)
        return commitment

    async def start_session(
        self,
        user_id: UUID,
        skill_id: UUID,
        task_id: UUID | None,
        focus_duration: int,
        break_duration: int,
    ) -> StudySessionModel:
        await self.get_skill(user_id, skill_id)

        active_session_stmt = select(StudySessionModel).where(
            StudySessionModel.user_id == user_id,
            StudySessionModel.status == "active",
        )
        active_session_result = await self.db_session.execute(active_session_stmt)
        active_session = active_session_result.scalar_one_or_none()
        if active_session:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An active session already exists")

        if task_id:
            task_stmt = (
                select(LearningTaskModel)
                .join(SubSkillModel, SubSkillModel.id == LearningTaskModel.sub_skill_id)
                .where(
                    LearningTaskModel.id == task_id,
                    SubSkillModel.skill_id == skill_id,
                )
            )
            task_result = await self.db_session.execute(task_stmt)
            task = task_result.scalar_one_or_none()
            if not task:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task does not belong to skill")

        session = StudySessionModel(
            user_id=user_id,
            skill_id=skill_id,
            task_id=task_id,
            started_at=datetime.now(timezone.utc),
            focus_duration=focus_duration,
            break_duration=break_duration,
            status="active",
            pomodoros_completed=0,
            total_focus_minutes=0,
        )
        self.db_session.add(session)
        await self.db_session.commit()
        await self.db_session.refresh(session)
        return session

    async def log_pomodoro(
        self,
        user_id: UUID,
        session_id: UUID,
        log_type: str,
        started_at: datetime,
        ended_at: datetime | None,
        completed: bool,
    ) -> StudySessionModel:
        session = await self._get_session(session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        if session.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Session does not belong to user")
        if session.status != "active":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Session is not active")

        log = PomodoroLogModel(
            session_id=session_id,
            type=log_type,
            started_at=self._to_utc(started_at),
            ended_at=self._to_utc(ended_at) if ended_at else None,
            completed=completed,
        )
        self.db_session.add(log)

        if completed and log_type == "focus":
            session.pomodoros_completed += 1

        await self.db_session.commit()
        await self.db_session.refresh(session)
        return session

    async def end_session(
        self,
        user_id: UUID,
        session_id: UUID,
        ended_at: datetime | None,
        event_publisher: EventPublisher,
    ) -> StudySessionModel:
        session = await self._get_session(session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        if session.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Session does not belong to user")
        if session.status != "active":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Session already ended")

        final_ended_at = self._to_utc(ended_at) if ended_at else datetime.now(timezone.utc)
        session.ended_at = final_ended_at
        session.status = "completed"

        logs_stmt = select(PomodoroLogModel).where(
            PomodoroLogModel.session_id == session_id,
            PomodoroLogModel.type == "focus",
            PomodoroLogModel.completed.is_(True),
        )
        logs_result = await self.db_session.execute(logs_stmt)
        logs = list(logs_result.scalars().all())

        focus_minutes = 0.0
        for log in logs:
            if log.started_at and log.ended_at:
                delta_seconds = max((log.ended_at - log.started_at).total_seconds(), 0)
                focus_minutes += delta_seconds / 60

        if focus_minutes == 0 and session.pomodoros_completed > 0:
            focus_minutes = float(session.pomodoros_completed * session.focus_duration)

        session.total_focus_minutes = focus_minutes

        skill = await self.get_skill(user_id, session.skill_id)
        skill.total_hours_logged += focus_minutes / 60

        commitment = await self._get_commitment(user_id, session.skill_id)
        if commitment and commitment.status == "committed":
            commitment.hours_completed += focus_minutes / 60
            if commitment.hours_completed >= commitment.target_hours:
                commitment.status = "completed"

        await self.db_session.commit()
        await self.db_session.refresh(session)

        await event_publisher.publish(
            routing_key="session.completed",
            payload={
                "event_type": "session.completed",
                "user_id": str(user_id),
                "session_id": str(session.id),
                "skill_id": str(session.skill_id),
                "total_focus_minutes": session.total_focus_minutes,
                "pomodoros_completed": session.pomodoros_completed,
                "completed_at": final_ended_at.isoformat(),
            },
        )

        return session

    async def list_sessions(self, user_id: UUID) -> list[StudySessionModel]:
        stmt = select(StudySessionModel).where(StudySessionModel.user_id == user_id).order_by(StudySessionModel.started_at.desc())
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_session(self, user_id: UUID, session_id: UUID) -> StudySessionModel:
        session = await self._get_session(session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        if session.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Session does not belong to user")
        return session

    async def create_flashcard(self, user_id: UUID, skill_id: UUID, front: str, back: str) -> FlashcardModel:
        await self.get_skill(user_id, skill_id)

        card = FlashcardModel(
            user_id=user_id,
            skill_id=skill_id,
            front=front,
            back=back,
        )
        self.db_session.add(card)
        await self.db_session.commit()
        await self.db_session.refresh(card)
        return card

    async def list_flashcards(
        self,
        user_id: UUID,
        skill_id: UUID | None,
        due_today: bool,
    ) -> list[FlashcardModel]:
        latest_review_subquery = (
            select(
                FlashcardReviewModel.card_id.label("card_id"),
                func.max(FlashcardReviewModel.reviewed_at).label("latest_reviewed_at"),
            )
            .where(FlashcardReviewModel.user_id == user_id)
            .group_by(FlashcardReviewModel.card_id)
            .subquery()
        )
        latest_review = aliased(FlashcardReviewModel)

        stmt = (
            select(FlashcardModel)
            .outerjoin(latest_review_subquery, latest_review_subquery.c.card_id == FlashcardModel.id)
            .outerjoin(
                latest_review,
                and_(
                    latest_review.card_id == FlashcardModel.id,
                    latest_review.reviewed_at == latest_review_subquery.c.latest_reviewed_at,
                ),
            )
            .where(FlashcardModel.user_id == user_id)
            .order_by(FlashcardModel.created_at.desc())
        )

        if skill_id is not None:
            stmt = stmt.where(FlashcardModel.skill_id == skill_id)

        if due_today:
            now_utc = datetime.now(timezone.utc)
            start_of_tomorrow = datetime.combine(now_utc.date() + timedelta(days=1), time.min, tzinfo=timezone.utc)
            stmt = stmt.where(or_(latest_review.id.is_(None), latest_review.next_review_at < start_of_tomorrow))

        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def review_flashcard(
        self,
        user_id: UUID,
        card_id: UUID,
        difficulty: int,
        reviewed_at: datetime | None,
    ) -> FlashcardReviewModel:
        card = await self._get_flashcard_owned(user_id, card_id)
        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found")

        latest_review_stmt = (
            select(FlashcardReviewModel)
            .where(
                FlashcardReviewModel.card_id == card_id,
                FlashcardReviewModel.user_id == user_id,
            )
            .order_by(FlashcardReviewModel.reviewed_at.desc())
            .limit(1)
        )
        latest_review_result = await self.db_session.execute(latest_review_stmt)
        latest_review = latest_review_result.scalar_one_or_none()

        review_at = self._to_utc(reviewed_at) if reviewed_at else datetime.now(timezone.utc)
        interval_days, easiness_factor, repetitions = self._calculate_sm2(
            previous=latest_review,
            difficulty=difficulty,
        )

        review = FlashcardReviewModel(
            card_id=card_id,
            user_id=user_id,
            reviewed_at=review_at,
            difficulty=difficulty,
            interval_days=interval_days,
            easiness_factor=easiness_factor,
            repetitions=repetitions,
            next_review_at=review_at + timedelta(days=interval_days),
        )
        self.db_session.add(review)
        await self.db_session.commit()
        await self.db_session.refresh(review)
        return review

    async def get_flashcard_stats(self, user_id: UUID, skill_id: UUID | None) -> dict[str, int]:
        cards_stmt = select(func.count(FlashcardModel.id)).where(FlashcardModel.user_id == user_id)
        if skill_id is not None:
            cards_stmt = cards_stmt.where(FlashcardModel.skill_id == skill_id)
        total_cards = int((await self.db_session.execute(cards_stmt)).scalar_one())

        due_cards = len(await self.list_flashcards(user_id=user_id, skill_id=skill_id, due_today=True))

        reviews_stmt = (
            select(func.count(FlashcardReviewModel.id))
            .join(FlashcardModel, FlashcardModel.id == FlashcardReviewModel.card_id)
            .where(FlashcardReviewModel.user_id == user_id)
        )
        if skill_id is not None:
            reviews_stmt = reviews_stmt.where(FlashcardModel.skill_id == skill_id)
        total_reviews = int((await self.db_session.execute(reviews_stmt)).scalar_one())

        now_utc = datetime.now(timezone.utc)
        start_of_day = datetime.combine(now_utc.date(), time.min, tzinfo=timezone.utc)
        start_of_tomorrow = start_of_day + timedelta(days=1)
        reviews_today_stmt = (
            select(func.count(FlashcardReviewModel.id))
            .join(FlashcardModel, FlashcardModel.id == FlashcardReviewModel.card_id)
            .where(
                FlashcardReviewModel.user_id == user_id,
                FlashcardReviewModel.reviewed_at >= start_of_day,
                FlashcardReviewModel.reviewed_at < start_of_tomorrow,
            )
        )
        if skill_id is not None:
            reviews_today_stmt = reviews_today_stmt.where(FlashcardModel.skill_id == skill_id)
        reviews_today = int((await self.db_session.execute(reviews_today_stmt)).scalar_one())

        return {
            "total_cards": total_cards,
            "due_today": due_cards,
            "total_reviews": total_reviews,
            "reviews_today": reviews_today,
        }

    async def create_error_entry(
        self,
        user_id: UUID,
        skill_id: UUID,
        session_id: UUID | None,
        title: str,
        description: str | None,
        lesson_learned: str | None,
    ) -> ErrorEntryModel:
        await self.get_skill(user_id, skill_id)

        if session_id:
            session = await self._get_session(session_id)
            if not session or session.user_id != user_id or session.skill_id != skill_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session does not belong to user skill")

        entry = ErrorEntryModel(
            user_id=user_id,
            skill_id=skill_id,
            session_id=session_id,
            title=title,
            description=description,
            lesson_learned=lesson_learned,
        )
        self.db_session.add(entry)
        await self.db_session.commit()
        await self.db_session.refresh(entry)
        return entry

    async def list_error_entries(self, user_id: UUID, skill_id: UUID | None) -> list[ErrorEntryModel]:
        stmt = select(ErrorEntryModel).where(ErrorEntryModel.user_id == user_id).order_by(ErrorEntryModel.created_at.desc())
        if skill_id is not None:
            stmt = stmt.where(ErrorEntryModel.skill_id == skill_id)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_error_entry(self, user_id: UUID, entry_id: UUID) -> ErrorEntryModel:
        entry = await self._get_error_entry_owned(user_id, entry_id)
        if not entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
        return entry

    async def update_error_entry(
        self,
        user_id: UUID,
        entry_id: UUID,
        title: str | None,
        description: str | None,
        lesson_learned: str | None,
    ) -> ErrorEntryModel:
        entry = await self.get_error_entry(user_id, entry_id)

        if title is not None:
            entry.title = title
        if description is not None:
            entry.description = description
        if lesson_learned is not None:
            entry.lesson_learned = lesson_learned
        entry.updated_at = datetime.now(timezone.utc)

        await self.db_session.commit()
        await self.db_session.refresh(entry)
        return entry

    async def _get_skill_owned(self, user_id: UUID, skill_id: UUID) -> SkillModel | None:
        stmt = select(SkillModel).where(SkillModel.id == skill_id, SkillModel.user_id == user_id)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_sub_skill(self, skill_id: UUID, sub_skill_id: UUID) -> SubSkillModel | None:
        stmt = select(SubSkillModel).where(SubSkillModel.id == sub_skill_id, SubSkillModel.skill_id == skill_id)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_commitment(self, user_id: UUID, skill_id: UUID) -> SkillCommitmentModel | None:
        stmt = select(SkillCommitmentModel).where(
            SkillCommitmentModel.user_id == user_id,
            SkillCommitmentModel.skill_id == skill_id,
        )
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_session(self, session_id: UUID) -> StudySessionModel | None:
        stmt = select(StudySessionModel).where(StudySessionModel.id == session_id)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_flashcard_owned(self, user_id: UUID, card_id: UUID) -> FlashcardModel | None:
        stmt = select(FlashcardModel).where(FlashcardModel.id == card_id, FlashcardModel.user_id == user_id)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_error_entry_owned(self, user_id: UUID, entry_id: UUID) -> ErrorEntryModel | None:
        stmt = select(ErrorEntryModel).where(ErrorEntryModel.id == entry_id, ErrorEntryModel.user_id == user_id)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    def _to_utc(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _calculate_sm2(previous: FlashcardReviewModel | None, difficulty: int) -> tuple[int, float, int]:
        previous_ease = previous.easiness_factor if previous else 2.5
        previous_interval = previous.interval_days if previous else 1
        previous_repetitions = previous.repetitions if previous else 0

        delta = 5 - difficulty
        easiness_factor = previous_ease + (0.1 - delta * (0.08 + delta * 0.02))
        easiness_factor = max(1.3, easiness_factor)

        if difficulty < 3:
            repetitions = 0
            interval_days = 1
        else:
            repetitions = previous_repetitions + 1
            if repetitions == 1:
                interval_days = 1
            elif repetitions == 2:
                interval_days = 6
            else:
                interval_days = max(1, int(round(previous_interval * easiness_factor)))

        return interval_days, easiness_factor, repetitions
