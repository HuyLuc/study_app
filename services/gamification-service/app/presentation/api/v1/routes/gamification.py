from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.gamification_use_cases import GamificationUseCases
from app.infrastructure.db.session import get_db_session
from app.presentation.api.v1.dependencies import get_current_user_id
from app.presentation.schemas.gamification import (
    BadgeProgressResponse,
    BadgeResponse,
    LeaderboardEntryResponse,
    RewardHistoryResponse,
    RewardItemResponse,
    StreakCalendarItemResponse,
    StreakResponse,
    UserProfileResponse,
)

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserProfileResponse:
    use_cases = GamificationUseCases(db_session)
    profile = await use_cases.get_profile(user_id)
    return UserProfileResponse.model_validate(profile)


@router.get("/leaderboard", response_model=list[LeaderboardEntryResponse])
async def get_leaderboard(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    limit: int = Query(default=20, ge=1, le=100),
) -> list[LeaderboardEntryResponse]:
    use_cases = GamificationUseCases(db_session)
    rows = await use_cases.get_leaderboard(limit=limit)
    return [LeaderboardEntryResponse.model_validate(row) for row in rows]


@router.get("/streak", response_model=StreakResponse)
async def get_streak(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> StreakResponse:
    use_cases = GamificationUseCases(db_session)
    streak = await use_cases.get_streak(user_id)
    return StreakResponse.model_validate(streak)


@router.post("/streak/freeze", response_model=StreakResponse)
async def use_streak_freeze(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> StreakResponse:
    use_cases = GamificationUseCases(db_session)
    streak = await use_cases.use_streak_freeze(user_id)
    return StreakResponse.model_validate(streak)


@router.get("/streak/calendar", response_model=list[StreakCalendarItemResponse])
async def get_streak_calendar(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    last_days: int = Query(default=30, ge=1, le=365),
) -> list[StreakCalendarItemResponse]:
    use_cases = GamificationUseCases(db_session)
    data = await use_cases.get_streak_calendar(user_id=user_id, last_days=last_days)
    return [StreakCalendarItemResponse.model_validate(item) for item in data]


@router.get("/rewards/history", response_model=list[RewardHistoryResponse])
async def get_reward_history(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[RewardHistoryResponse]:
    use_cases = GamificationUseCases(db_session)
    rows = await use_cases.list_reward_history(user_id)
    return [RewardHistoryResponse.model_validate(item) for item in rows]


@router.get("/rewards/pool", response_model=list[RewardItemResponse])
async def get_reward_pool(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[RewardItemResponse]:
    use_cases = GamificationUseCases(db_session)
    pool = await use_cases.list_reward_pool()
    return [RewardItemResponse.model_validate(item) for item in pool]


@router.get("/badges", response_model=list[BadgeResponse])
async def get_user_badges(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[BadgeResponse]:
    use_cases = GamificationUseCases(db_session)
    rows = await use_cases.list_user_badges(user_id)
    return [BadgeResponse.model_validate(item) for item in rows]


@router.get("/badges/all", response_model=list[BadgeProgressResponse])
async def get_all_badges(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[BadgeProgressResponse]:
    use_cases = GamificationUseCases(db_session)
    rows = await use_cases.list_all_badges(user_id)
    return [BadgeProgressResponse.model_validate(item) for item in rows]
