from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.learning_use_cases import LearningUseCases
from app.infrastructure.db.session import get_db_session
from app.presentation.api.v1.dependencies import get_current_user_id
from app.presentation.schemas.learning import CommitmentCreateRequest, CommitmentResponse

router = APIRouter(prefix="/skills/{skill_id}/commitment", tags=["commitments"])


@router.post("", response_model=CommitmentResponse)
async def create_commitment(
    skill_id: UUID,
    payload: CommitmentCreateRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CommitmentResponse:
    use_cases = LearningUseCases(db_session)
    commitment = await use_cases.create_commitment(user_id, skill_id, payload.target_hours)
    return CommitmentResponse.model_validate(commitment)


@router.get("", response_model=CommitmentResponse)
async def get_commitment(
    skill_id: UUID,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CommitmentResponse:
    use_cases = LearningUseCases(db_session)
    commitment = await use_cases.get_commitment(user_id, skill_id)
    return CommitmentResponse.model_validate(commitment)


@router.put("/abandon", response_model=CommitmentResponse)
async def abandon_commitment(
    skill_id: UUID,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CommitmentResponse:
    use_cases = LearningUseCases(db_session)
    commitment = await use_cases.abandon_commitment(user_id, skill_id)
    return CommitmentResponse.model_validate(commitment)
