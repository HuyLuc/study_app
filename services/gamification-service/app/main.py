from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.infrastructure.db.session import AsyncSessionLocal, dispose_db_engine
from app.infrastructure.messaging.event_publisher import EventPublisher
from app.infrastructure.messaging.session_consumer import SessionCompletedConsumer
from app.presentation.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.event_publisher = EventPublisher(settings.rabbitmq_url)
    await app.state.event_publisher.connect()

    app.state.session_consumer = SessionCompletedConsumer(
        amqp_url=settings.rabbitmq_url,
        session_factory=AsyncSessionLocal,
        event_publisher=app.state.event_publisher,
    )
    await app.state.session_consumer.start()

    try:
        yield
    finally:
        await app.state.session_consumer.close()
        await app.state.event_publisher.close()
        await dispose_db_engine()


app = FastAPI(title=settings.service_name, version=settings.service_version, lifespan=lifespan)

app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    return {
        "message": "Gamification Service is running.",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {
        "service": settings.service_name,
        "status": "ok",
    }
