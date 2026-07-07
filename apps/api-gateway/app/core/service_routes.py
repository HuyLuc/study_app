from __future__ import annotations

from app.core.config import settings


SERVICE_ROUTES: dict[str, tuple[str, str]] = {
    "auth": (settings.auth_service_url, "/api/v1/auth"),
    "skills": (settings.learning_service_url, "/api/v1/skills"),
    "sessions": (settings.learning_service_url, "/api/v1/sessions"),
    "flashcards": (settings.learning_service_url, "/api/v1/flashcards"),
    "journal": (settings.learning_service_url, "/api/v1/journal"),
    "gamification": (settings.gamification_service_url, "/api/v1/gamification"),
    "notifications": (settings.notification_service_url, "/api/v1/notifications"),
}

PUBLIC_PATHS = {
    "/",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/auth/register",
    "/auth/login",
    "/auth/refresh",
}

AUTH_REQUIRED_PREFIXES = (
    "/auth",
    "/skills",
    "/sessions",
    "/flashcards",
    "/journal",
    "/gamification",
    "/notifications",
)

AUTH_WHITELIST_EXACT = {
    "/auth/register",
    "/auth/login",
    "/auth/refresh",
}
