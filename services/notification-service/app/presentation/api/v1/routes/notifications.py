from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.notification_use_cases import NotificationUseCases
from app.infrastructure.db.session import get_db_session
from app.presentation.api.v1.dependencies import get_current_user_id
from app.presentation.schemas.notification import (
    MarkAllReadResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdateRequest,
    NotificationResponse,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[NotificationResponse]:
    use_cases = NotificationUseCases(db_session)
    items = await use_cases.list_notifications(user_id=user_id, unread_only=unread_only, limit=limit, offset=offset)
    return [NotificationResponse.model_validate(item) for item in items]


@router.post("/read-all", response_model=MarkAllReadResponse)
async def mark_all_read(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> MarkAllReadResponse:
    use_cases = NotificationUseCases(db_session)
    count = await use_cases.mark_all_read(user_id)
    return MarkAllReadResponse(updated_count=count)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> NotificationResponse:
    use_cases = NotificationUseCases(db_session)
    item = await use_cases.mark_read(user_id=user_id, notification_id=notification_id)
    return NotificationResponse.model_validate(item)


@router.get("/preferences", response_model=list[NotificationPreferenceResponse])
async def get_preferences(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[NotificationPreferenceResponse]:
    use_cases = NotificationUseCases(db_session)
    rows = await use_cases.get_preferences(user_id)
    return [NotificationPreferenceResponse.model_validate(item) for item in rows]


@router.put("/preferences", response_model=list[NotificationPreferenceResponse])
async def update_preferences(
    payload: NotificationPreferenceUpdateRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[NotificationPreferenceResponse]:
    use_cases = NotificationUseCases(db_session)
    rows = await use_cases.update_preferences(user_id=user_id, updates=payload.preferences)
    return [NotificationPreferenceResponse.model_validate(item) for item in rows]
