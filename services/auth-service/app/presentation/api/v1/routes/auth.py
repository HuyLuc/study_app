from __future__ import annotations

from typing import Annotated

import redis.asyncio as redis
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.auth_use_cases import (
    LoginUserUseCase,
    LogoutUserUseCase,
    RefreshTokenUseCase,
    RegisterUserUseCase,
    VerifyAccessTokenUseCase,
)
from app.infrastructure.db.session import get_db_session
from app.infrastructure.repositories.user_repository import SQLAlchemyUserRepository
from app.presentation.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPairResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def get_redis_client(request: Request) -> redis.Redis:
    return request.app.state.redis


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserResponse:
    user_repository = SQLAlchemyUserRepository(db_session)
    use_case = RegisterUserUseCase(user_repository)
    user = await use_case.execute(payload.email, payload.password, payload.display_name)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenPairResponse)
async def login(
    payload: LoginRequest,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    redis_client: Annotated[redis.Redis, Depends(get_redis_client)],
) -> TokenPairResponse:
    user_repository = SQLAlchemyUserRepository(db_session)
    use_case = LoginUserUseCase(user_repository, redis_client)
    token_pair = await use_case.execute(payload.email, payload.password)
    return TokenPairResponse.model_validate(token_pair)


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh(
    payload: RefreshRequest,
    redis_client: Annotated[redis.Redis, Depends(get_redis_client)],
) -> TokenPairResponse:
    use_case = RefreshTokenUseCase(redis_client)
    token_pair = await use_case.execute(payload.refresh_token)
    return TokenPairResponse.model_validate(token_pair)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: LogoutRequest,
    redis_client: Annotated[redis.Redis, Depends(get_redis_client)],
) -> None:
    use_case = LogoutUserUseCase(redis_client)
    await use_case.execute(payload.refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(
    authorization: Annotated[str | None, Header()] = None,
    db_session: Annotated[AsyncSession, Depends(get_db_session)] = None,
) -> UserResponse:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    access_token = authorization.split(" ", 1)[1]
    user_repository = SQLAlchemyUserRepository(db_session)
    use_case = VerifyAccessTokenUseCase(user_repository)
    user = await use_case.execute(access_token)
    return UserResponse.model_validate(user)
