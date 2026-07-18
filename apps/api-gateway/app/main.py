from contextlib import asynccontextmanager

import httpx
import redis.asyncio as redis
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.rate_limit import RedisRateLimiter
from app.core.service_routes import AUTH_REQUIRED_PREFIXES, AUTH_WHITELIST_EXACT, PUBLIC_PATHS
from app.presentation.routes.health import router as health_router
from app.presentation.routes.proxy import router as proxy_router


def _parse_allowed_origins(raw_value: str) -> list[str]:
    return [item.strip() for item in raw_value.split(",") if item.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=3.0))
    app.state.redis = redis.from_url(settings.redis_url, decode_responses=True)
    app.state.rate_limiter = RedisRateLimiter(app.state.redis, settings.rate_limit_per_minute)
    try:
        yield
    finally:
        await app.state.http_client.aclose()
        await app.state.redis.aclose()


app = FastAPI(title=settings.service_name, version=settings.service_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_allowed_origins(settings.cors_allow_origins),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(proxy_router)


@app.middleware("http")
async def auth_and_rate_limit_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id

    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")

    if _is_public_path(path):
        allowed = await request.app.state.rate_limiter.allow_ip(client_ip, settings.rate_limit_ip_per_minute)
        if not allowed:
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
        return await call_next(request)

    if _requires_auth(path):
        authorization = request.headers.get("authorization")
        if not authorization:
            return JSONResponse(status_code=401, content={"detail": "Missing Authorization header"})

        user_context = await _verify_token_with_auth_service(request, authorization)
        if not user_context:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

        user_id = str(user_context["user_id"])
        allowed = await request.app.state.rate_limiter.allow(user_id)
        if not allowed:
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

        request.state.user_id = user_id
        request.state.user_email = user_context["email"]

    return await call_next(request)


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    return {
        "message": "API Gateway is running.",
        "docs": "/docs",
    }


def _is_public_path(path: str) -> bool:
    if path in PUBLIC_PATHS:
        return True

    return path.startswith("/docs")


def _requires_auth(path: str) -> bool:
    if path in AUTH_WHITELIST_EXACT:
        return False

    return path.startswith(AUTH_REQUIRED_PREFIXES)


async def _verify_token_with_auth_service(request: Request, authorization: str) -> dict | None:
    try:
        response = await request.app.state.http_client.get(
            f"{settings.auth_service_url}/api/v1/internal/verify-token",
            headers={"Authorization": authorization},
        )
    except httpx.HTTPError:
        return None

    if response.status_code != 200:
        return None

    payload = response.json()
    required_keys = {"user_id", "email", "is_active"}
    if not required_keys.issubset(payload.keys()) or not payload["is_active"]:
        return None

    return payload
