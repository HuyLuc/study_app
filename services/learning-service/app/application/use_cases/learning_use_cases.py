from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.models import (
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
            started_at=started_at,
            ended_at=ended_at,
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

        final_ended_at = ended_at or datetime.now(timezone.utc)
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
