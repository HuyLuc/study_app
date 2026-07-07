from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "status": "ok",
        "environment": settings.environment,
    }