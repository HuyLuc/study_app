from __future__ import annotations

from uuid import UUID

import redis.asyncio as redis
from fastapi import HTTPException, status

from app.application.dto.auth_dto import TokenPairDTO
from app.core.config import settings
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.db.models import UserModel


class RegisterUserUseCase:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    async def execute(self, email: str, password: str, display_name: str | None) -> UserModel:
        normalized_email = email.strip().lower()
        existing_user = await self.user_repository.get_by_email(normalized_email)
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        hashed_password = hash_password(password)
        return await self.user_repository.create(normalized_email, hashed_password, display_name)


class LoginUserUseCase:
    def __init__(self, user_repository: UserRepository, redis_client: redis.Redis):
        self.user_repository = user_repository
        self.redis_client = redis_client

    async def execute(self, email: str, password: str) -> TokenPairDTO:
        normalized_email = email.strip().lower()
        user = await self.user_repository.get_by_email(normalized_email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

        access_token, _ = create_access_token(str(user.id), user.email)
        refresh_token, refresh_jti = create_refresh_token(str(user.id), user.email)

        await self.redis_client.setex(_refresh_whitelist_key(refresh_jti), _refresh_ttl_seconds(), str(user.id))

        return TokenPairDTO(
            access_token=access_token,
            refresh_token=refresh_token,
            access_token_expires_in=settings.access_token_expire_minutes * 60,
            refresh_token_expires_in=_refresh_ttl_seconds(),
        )


class RefreshTokenUseCase:
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client

    async def execute(self, refresh_token: str) -> TokenPairDTO:
        payload = _decode_refresh_token(refresh_token)

        old_jti = payload["jti"]
        user_id = payload["sub"]
        email = payload["email"]

        if await self.redis_client.exists(_refresh_blacklist_key(old_jti)):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")

        if not await self.redis_client.exists(_refresh_whitelist_key(old_jti)):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

        await self.redis_client.delete(_refresh_whitelist_key(old_jti))
        await self.redis_client.setex(_refresh_blacklist_key(old_jti), _refresh_ttl_seconds(), "1")

        access_token, _ = create_access_token(user_id, email)
        new_refresh_token, new_refresh_jti = create_refresh_token(user_id, email)
        await self.redis_client.setex(_refresh_whitelist_key(new_refresh_jti), _refresh_ttl_seconds(), user_id)

        return TokenPairDTO(
            access_token=access_token,
            refresh_token=new_refresh_token,
            access_token_expires_in=settings.access_token_expire_minutes * 60,
            refresh_token_expires_in=_refresh_ttl_seconds(),
        )


class LogoutUserUseCase:
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client

    async def execute(self, refresh_token: str) -> None:
        payload = _decode_refresh_token(refresh_token)
        jti = payload["jti"]

        await self.redis_client.delete(_refresh_whitelist_key(jti))
        await self.redis_client.setex(_refresh_blacklist_key(jti), _refresh_ttl_seconds(), "1")


class VerifyAccessTokenUseCase:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    async def execute(self, access_token: str) -> UserModel:
        try:
            payload = decode_token(access_token)
        except TokenError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")

        user_id_raw = payload.get("sub")
        if not user_id_raw:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

        try:
            user_id = UUID(user_id_raw)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject") from exc

        user = await self.user_repository.get_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

        return user


def _refresh_whitelist_key(jti: str) -> str:
    return f"auth:refresh:whitelist:{jti}"


def _refresh_blacklist_key(jti: str) -> str:
    return f"auth:refresh:blacklist:{jti}"


def _refresh_ttl_seconds() -> int:
    return settings.refresh_token_expire_days * 24 * 60 * 60


def _decode_refresh_token(refresh_token: str) -> dict:
    try:
        payload = decode_token(refresh_token)
    except TokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if not payload.get("jti") or not payload.get("sub") or not payload.get("email"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token payload")

    return payload
