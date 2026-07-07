from __future__ import annotations

import redis.asyncio as redis

from app.core.config import settings


def build_redis_client() -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)
