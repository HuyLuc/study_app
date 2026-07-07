from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.learning_use_cases import LearningUseCases
from app.infrastructure.db.session import get_db_session
from app.presentation.api.v1.dependencies import get_current_user_id
from app.presentation.schemas.learning import (
    DueFilter,
    FlashcardCreateRequest,
    FlashcardResponse,
    FlashcardReviewRequest,
    FlashcardReviewResponse,
    FlashcardStatsResponse,
)

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


@router.post("", response_model=FlashcardResponse)
async def create_flashcard(
    payload: FlashcardCreateRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> FlashcardResponse:
    use_cases = LearningUseCases(db_session)
    card = await use_cases.create_flashcard(
        user_id=user_id,
        skill_id=payload.skill_id,
        front=payload.front,
        back=payload.back,
    )
    return FlashcardResponse.model_validate(card)


@router.get("", response_model=list[FlashcardResponse])
async def list_flashcards(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    skill_id: UUID | None = Query(default=None),
    due: DueFilter | None = Query(default=None),
) -> list[FlashcardResponse]:
    use_cases = LearningUseCases(db_session)
    cards = await use_cases.list_flashcards(
        user_id=user_id,
        skill_id=skill_id,
        due_today=due == "today",
    )
    return [FlashcardResponse.model_validate(card) for card in cards]


@router.post("/{card_id}/review", response_model=FlashcardReviewResponse)
async def review_flashcard(
    card_id: UUID,
    payload: FlashcardReviewRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> FlashcardReviewResponse:
    use_cases = LearningUseCases(db_session)
    review = await use_cases.review_flashcard(
        user_id=user_id,
        card_id=card_id,
        difficulty=payload.difficulty,
        reviewed_at=payload.reviewed_at,
    )
    return FlashcardReviewResponse.model_validate(review)


@router.get("/stats", response_model=FlashcardStatsResponse)
async def get_flashcard_stats(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    skill_id: UUID | None = Query(default=None),
) -> FlashcardStatsResponse:
    use_cases = LearningUseCases(db_session)
    stats = await use_cases.get_flashcard_stats(user_id=user_id, skill_id=skill_id)
    return FlashcardStatsResponse.model_validate(stats)
