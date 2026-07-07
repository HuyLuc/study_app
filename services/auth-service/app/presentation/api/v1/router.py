from fastapi import APIRouter

from app.presentation.api.v1.routes.auth import router as auth_router
from app.presentation.api.v1.routes.health import router as health_router
from app.presentation.api.v1.routes.internal import router as internal_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(internal_router)
