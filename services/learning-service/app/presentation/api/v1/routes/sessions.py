from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.learning_use_cases import LearningUseCases
from app.infrastructure.db.session import get_db_session
from app.presentation.api.v1.dependencies import get_current_user_id
from app.presentation.schemas.learning import (
    PomodoroLogRequest,
    SessionEndRequest,
    SessionResponse,
    SessionStartRequest,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/start", response_model=SessionResponse)
async def start_session(
    payload: SessionStartRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SessionResponse:
    use_cases = LearningUseCases(db_session)
    session = await use_cases.start_session(
        user_id=user_id,
        skill_id=payload.skill_id,
        task_id=payload.task_id,
        focus_duration=payload.focus_duration,
        break_duration=payload.break_duration,
    )
    return SessionResponse.model_validate(session)


@router.post("/{session_id}/pomodoro", response_model=SessionResponse)
async def log_pomodoro(
    session_id: UUID,
    payload: PomodoroLogRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SessionResponse:
    use_cases = LearningUseCases(db_session)
    session = await use_cases.log_pomodoro(
        user_id=user_id,
        session_id=session_id,
        log_type=payload.type,
        started_at=payload.started_at,
        ended_at=payload.ended_at,
        completed=payload.completed,
    )
    return SessionResponse.model_validate(session)


@router.post("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: UUID,
    payload: SessionEndRequest,
    request: Request,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SessionResponse:
    use_cases = LearningUseCases(db_session)
    session = await use_cases.end_session(
        user_id=user_id,
        session_id=session_id,
        ended_at=payload.ended_at,
        event_publisher=request.app.state.event_publisher,
    )
    return SessionResponse.model_validate(session)


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[SessionResponse]:
    use_cases = LearningUseCases(db_session)
    sessions = await use_cases.list_sessions(user_id)
    return [SessionResponse.model_validate(item) for item in sessions]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: UUID,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SessionResponse:
    use_cases = LearningUseCases(db_session)
    session = await use_cases.get_session(user_id, session_id)
    return SessionResponse.model_validate(session)
