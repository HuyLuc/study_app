from __future__ import annotations

import json

import aio_pika
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.application.use_cases.gamification_use_cases import GamificationUseCases
from app.infrastructure.messaging.event_publisher import EventPublisher


class SessionCompletedConsumer:
    def __init__(
        self,
        amqp_url: str,
        session_factory: async_sessionmaker[AsyncSession],
        event_publisher: EventPublisher,
        exchange_name: str = "study_app.events",
        queue_name: str = "gamification.session_handler",
    ):
        self.amqp_url = amqp_url
        self.session_factory = session_factory
        self.event_publisher = event_publisher
        self.exchange_name = exchange_name
        self.queue_name = queue_name

        self._connection: aio_pika.RobustConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None
        self._queue: aio_pika.abc.AbstractQueue | None = None

    async def start(self) -> None:
        self._connection = await aio_pika.connect_robust(self.amqp_url)
        self._channel = await self._connection.channel()

        exchange = await self._channel.declare_exchange(
            self.exchange_name,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )
        self._queue = await self._channel.declare_queue(self.queue_name, durable=True)
        await self._queue.bind(exchange, routing_key="session.completed")
        await self._queue.consume(self._handle_message)

    async def _handle_message(self, message: aio_pika.IncomingMessage) -> None:
        async with message.process(requeue=False):
            payload = json.loads(message.body.decode("utf-8"))
            async with self.session_factory() as session:
                use_cases = GamificationUseCases(session)
                await use_cases.handle_session_completed(payload, self.event_publisher)

    async def close(self) -> None:
        if self._connection:
            await self._connection.close()
