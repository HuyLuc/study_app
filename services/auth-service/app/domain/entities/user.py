from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(slots=True)
class User:
    id: UUID
    email: str
    hashed_password: str
    display_name: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
