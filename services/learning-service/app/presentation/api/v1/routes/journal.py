from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.learning_use_cases import LearningUseCases
from app.infrastructure.db.session import get_db_session
from app.presentation.api.v1.dependencies import get_current_user_id
from app.presentation.schemas.learning import ErrorEntryCreateRequest, ErrorEntryResponse, ErrorEntryUpdateRequest

router = APIRouter(prefix="/journal", tags=["journal"])


@router.post("", response_model=ErrorEntryResponse)
async def create_error_entry(
    payload: ErrorEntryCreateRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ErrorEntryResponse:
    use_cases = LearningUseCases(db_session)
    entry = await use_cases.create_error_entry(
        user_id=user_id,
        skill_id=payload.skill_id,
        session_id=payload.session_id,
        title=payload.title,
        description=payload.description,
        lesson_learned=payload.lesson_learned,
    )
    return ErrorEntryResponse.model_validate(entry)


@router.get("", response_model=list[ErrorEntryResponse])
async def list_error_entries(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    skill_id: UUID | None = Query(default=None),
) -> list[ErrorEntryResponse]:
    use_cases = LearningUseCases(db_session)
    entries = await use_cases.list_error_entries(user_id=user_id, skill_id=skill_id)
    return [ErrorEntryResponse.model_validate(entry) for entry in entries]


@router.get("/{entry_id}", response_model=ErrorEntryResponse)
async def get_error_entry(
    entry_id: UUID,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ErrorEntryResponse:
    use_cases = LearningUseCases(db_session)
    entry = await use_cases.get_error_entry(user_id=user_id, entry_id=entry_id)
    return ErrorEntryResponse.model_validate(entry)


@router.put("/{entry_id}", response_model=ErrorEntryResponse)
async def update_error_entry(
    entry_id: UUID,
    payload: ErrorEntryUpdateRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ErrorEntryResponse:
    use_cases = LearningUseCases(db_session)
    entry = await use_cases.update_error_entry(
        user_id=user_id,
        entry_id=entry_id,
        title=payload.title,
        description=payload.description,
        lesson_learned=payload.lesson_learned,
    )
    return ErrorEntryResponse.model_validate(entry)
