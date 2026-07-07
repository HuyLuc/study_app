from fastapi import APIRouter

from app.presentation.api.v1.routes.commitments import router as commitments_router
from app.presentation.api.v1.routes.health import router as health_router
from app.presentation.api.v1.routes.sessions import router as sessions_router
from app.presentation.api.v1.routes.skills import router as skills_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(skills_router)
api_router.include_router(commitments_router)
api_router.include_router(sessions_router)
