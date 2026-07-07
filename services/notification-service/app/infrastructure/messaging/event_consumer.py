from __future__ import annotations

import json

import aio_pika
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.application.use_cases.notification_use_cases import NotificationUseCases


class NotificationEventConsumer:
    def __init__(
        self,
        amqp_url: str,
        session_factory: async_sessionmaker[AsyncSession],
        exchange_name: str = "study_app.events",
    ):
        self.amqp_url = amqp_url
        self.session_factory = session_factory
        self.exchange_name = exchange_name

        self._connection: aio_pika.RobustConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None
        self._queues: list[aio_pika.abc.AbstractQueue] = []

        self._bindings: dict[str, str] = {
            "session.completed": "notification.session_handler",
            "streak.at_risk": "notification.streak_handler",
            "badge.unlocked": "notification.badge_handler",
            "reward.granted": "notification.reward_handler",
            "level.up": "notification.level_handler",
        }

    async def start(self) -> None:
        self._connection = await aio_pika.connect_robust(self.amqp_url)
        self._channel = await self._connection.channel()
        exchange = await self._channel.declare_exchange(
            self.exchange_name,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )

        for routing_key, queue_name in self._bindings.items():
            queue = await self._channel.declare_queue(queue_name, durable=True)
            await queue.bind(exchange, routing_key=routing_key)
            await queue.consume(lambda message, rk=routing_key: self._handle_message(message, rk))
            self._queues.append(queue)

    async def _handle_message(self, message: aio_pika.IncomingMessage, routing_key: str) -> None:
        async with message.process(requeue=False):
            payload = json.loads(message.body.decode("utf-8"))
            async with self.session_factory() as session:
                use_cases = NotificationUseCases(session)
                await use_cases.handle_event(routing_key, payload)

    async def close(self) -> None:
        if self._connection:
            await self._connection.close()
