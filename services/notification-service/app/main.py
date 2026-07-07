from fastapi import FastAPI

from app.core.config import settings
from app.presentation.api.v1.router import api_router

app = FastAPI(title=settings.service_name, version=settings.service_version)

app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    return {
        "message": "Notification Service is running.",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {
        "service": settings.service_name,
        "status": "ok",
    }