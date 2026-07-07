from __future__ import annotations

from pydantic import BaseModel, EmailStr


class UserContext(BaseModel):
    user_id: str
    email: EmailStr
    is_active: bool


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    access_token_expires_in: int
    refresh_token_expires_in: int
