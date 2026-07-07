from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenError(Exception):
    pass


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_context.verify(plain_password, hashed_password)


def _create_token(
    user_id: str,
    email: str,
    token_type: str,
    expires_delta: timedelta,
    jti: str | None = None,
) -> tuple[str, str]:
    token_jti = jti or str(uuid4())
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "type": token_type,
        "jti": token_jti,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, token_jti


def create_access_token(user_id: str, email: str) -> tuple[str, str]:
    return _create_token(user_id, email, "access", timedelta(minutes=settings.access_token_expire_minutes))


def create_refresh_token(user_id: str, email: str) -> tuple[str, str]:
    return _create_token(user_id, email, "refresh", timedelta(days=settings.refresh_token_expire_days))


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise TokenError("Invalid or expired token") from exc
