from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.learning_use_cases import LearningUseCases
from app.infrastructure.db.session import get_db_session
from app.presentation.api.v1.dependencies import get_current_user_id
from app.presentation.schemas.learning import (
    SkillCreateRequest,
    SkillResponse,
    SkillUpdateRequest,
    SubSkillCreateRequest,
    SubSkillResponse,
    SubSkillUpdateRequest,
    TaskCreateRequest,
    TaskResponse,
)

router = APIRouter(prefix="/skills", tags=["skills"])


@router.post("", response_model=SkillResponse)
async def create_skill(
    payload: SkillCreateRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SkillResponse:
    use_cases = LearningUseCases(db_session)
    skill = await use_cases.create_skill(user_id, payload.name, payload.description, payload.target_hours)
    return SkillResponse.model_validate(skill)


@router.get("", response_model=list[SkillResponse])
async def list_skills(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[SkillResponse]:
    use_cases = LearningUseCases(db_session)
    skills = await use_cases.list_skills(user_id)
    return [SkillResponse.model_validate(skill) for skill in skills]


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: UUID,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SkillResponse:
    use_cases = LearningUseCases(db_session)
    skill = await use_cases.get_skill(user_id, skill_id)
    return SkillResponse.model_validate(skill)


@router.put("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: UUID,
    payload: SkillUpdateRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SkillResponse:
    use_cases = LearningUseCases(db_session)
    skill = await use_cases.update_skill(
        user_id=user_id,
        skill_id=skill_id,
        name=payload.name,
        description=payload.description,
        target_hours=payload.target_hours,
        status_text=payload.status,
    )
    return SkillResponse.model_validate(skill)


@router.post("/{skill_id}/sub-skills", response_model=SubSkillResponse)
async def create_sub_skill(
    skill_id: UUID,
    payload: SubSkillCreateRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SubSkillResponse:
    use_cases = LearningUseCases(db_session)
    sub_skill = await use_cases.create_sub_skill(
        user_id=user_id,
        skill_id=skill_id,
        name=payload.name,
        is_core=payload.is_core,
        order_index=payload.order_index,
    )
    return SubSkillResponse.model_validate(sub_skill)


@router.put("/{skill_id}/sub-skills/{sub_skill_id}", response_model=SubSkillResponse)
async def update_sub_skill(
    skill_id: UUID,
    sub_skill_id: UUID,
    payload: SubSkillUpdateRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SubSkillResponse:
    use_cases = LearningUseCases(db_session)
    sub_skill = await use_cases.update_sub_skill(
        user_id=user_id,
        skill_id=skill_id,
        sub_skill_id=sub_skill_id,
        name=payload.name,
        is_core=payload.is_core,
        order_index=payload.order_index,
    )
    return SubSkillResponse.model_validate(sub_skill)


@router.post("/{skill_id}/tasks", response_model=TaskResponse)
async def create_task(
    skill_id: UUID,
    payload: TaskCreateRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> TaskResponse:
    use_cases = LearningUseCases(db_session)
    task = await use_cases.create_task(
        user_id=user_id,
        skill_id=skill_id,
        sub_skill_id=payload.sub_skill_id,
        title=payload.title,
        estimated_minutes=payload.estimated_minutes,
    )
    return TaskResponse.model_validate(task)
