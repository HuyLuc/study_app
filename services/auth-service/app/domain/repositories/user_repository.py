from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from app.infrastructure.db.models import UserModel


class UserRepository(ABC):
    @abstractmethod
    async def get_by_email(self, email: str) -> UserModel | None:
        raise NotImplementedError

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> UserModel | None:
        raise NotImplementedError

    @abstractmethod
    async def create(self, email: str, hashed_password: str, display_name: str | None) -> UserModel:
        raise NotImplementedError
