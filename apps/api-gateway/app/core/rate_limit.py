from __future__ import annotations

import time

import redis.asyncio as redis


class RedisRateLimiter:
    def __init__(self, redis_client: redis.Redis, limit_per_minute: int):
        self.redis_client = redis_client
        self.limit_per_minute = limit_per_minute

    async def allow(self, user_id: str) -> bool:
        bucket = int(time.time() // 60)
        key = f"gateway:rate:{user_id}:{bucket}"

        count = await self.redis_client.incr(key)
        if count == 1:
            await self.redis_client.expire(key, 61)

        return count <= self.limit_per_minute

    async def allow_ip(self, ip_address: str, limit: int) -> bool:
        bucket = int(time.time() // 60)
        key = f"gateway:rate:ip:{ip_address}:{bucket}"

        count = await self.redis_client.incr(key)
        if count == 1:
            await self.redis_client.expire(key, 61)

        return count <= limit
