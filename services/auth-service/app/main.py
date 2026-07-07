from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.infrastructure.cache.redis_client import build_redis_client
from app.infrastructure.db.session import dispose_db_engine
from app.presentation.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = build_redis_client()
    try:
        yield
    finally:
        await app.state.redis.aclose()
        await dispose_db_engine()


app = FastAPI(title=settings.service_name, version=settings.service_version, lifespan=lifespan)

app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    return {
        "message": "Auth Service is running.",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {
        "service": settings.service_name,
        "status": "ok",
    }
