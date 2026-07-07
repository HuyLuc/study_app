from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.auth_use_cases import VerifyAccessTokenUseCase
from app.infrastructure.db.session import get_db_session
from app.infrastructure.repositories.user_repository import SQLAlchemyUserRepository
from app.presentation.schemas.auth import VerifyTokenResponse

router = APIRouter(prefix="/internal", tags=["internal"])


@router.get("/verify-token", response_model=VerifyTokenResponse)
async def verify_token(
    authorization: Annotated[str | None, Header()] = None,
    db_session: Annotated[AsyncSession, Depends(get_db_session)] = None,
) -> VerifyTokenResponse:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    access_token = authorization.split(" ", 1)[1]
    user_repository = SQLAlchemyUserRepository(db_session)
    use_case = VerifyAccessTokenUseCase(user_repository)
    user = await use_case.execute(access_token)

    return VerifyTokenResponse(user_id=user.id, email=user.email, is_active=user.is_active)
