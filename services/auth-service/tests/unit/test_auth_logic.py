from pathlib import Path
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

SERVICE_ROOT = Path(__file__).resolve().parents[2]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.append(str(SERVICE_ROOT))

from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.application.use_cases.auth_use_cases import RegisterUserUseCase
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.db.models import UserModel


def test_password_hashing_and_verification():
    password = "MySecurePassword123"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_jwt_token_creation_and_decoding():
    user_id = "550e8400-e29b-41d4-a716-446655440000"
    email = "test@example.com"
    
    token, expires_at = create_access_token(user_id, email)
    assert token is not None
    
    payload = decode_token(token)
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["type"] == "access"


@pytest.mark.asyncio
async def test_register_user_success():
    repo = MagicMock(spec=UserRepository)
    repo.get_by_email = AsyncMock(return_value=None)
    
    expected_user = UserModel(
        id="550e8400-e29b-41d4-a716-446655440000",
        email="new@example.com",
        display_name="New User",
        is_active=True
    )
    repo.create = AsyncMock(return_value=expected_user)
    
    use_case = RegisterUserUseCase(user_repository=repo)
    user = await use_case.execute("new@example.com", "password123", "New User")
    
    assert user.email == "new@example.com"
    assert user.display_name == "New User"
    repo.get_by_email.assert_called_once_with("new@example.com")


@pytest.mark.asyncio
async def test_register_user_conflict():
    repo = MagicMock(spec=UserRepository)
    existing_user = UserModel(
        id="550e8400-e29b-41d4-a716-446655440000",
        email="existing@example.com",
        display_name="Existing User",
        is_active=True
    )
    repo.get_by_email = AsyncMock(return_value=existing_user)
    
    use_case = RegisterUserUseCase(user_repository=repo)
    
    with pytest.raises(HTTPException) as exc_info:
        await use_case.execute("existing@example.com", "password123", "Name")
        
    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Email already registered"
