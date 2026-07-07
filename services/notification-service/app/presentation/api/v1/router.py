from fastapi import APIRouter

from app.presentation.api.v1.routes.health import router as health_router
from app.presentation.api.v1.routes.notifications import router as notifications_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(notifications_router)
