from fastapi import FastAPI

from app.core.config import settings
from app.presentation.routes.health import router as health_router

app = FastAPI(title=settings.service_name, version=settings.service_version)

app.include_router(health_router)


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    return {
        "message": "API Gateway is running.",
        "docs": "/docs",
    }