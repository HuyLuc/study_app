from __future__ import annotations

import json

import aio_pika


class EventPublisher:
    def __init__(self, amqp_url: str, exchange_name: str = "study_app.events"):
        self.amqp_url = amqp_url
        self.exchange_name = exchange_name
        self._connection: aio_pika.RobustConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None
        self._exchange: aio_pika.abc.AbstractExchange | None = None

    async def connect(self) -> None:
        self._connection = await aio_pika.connect_robust(self.amqp_url)
        self._channel = await self._connection.channel()
        self._exchange = await self._channel.declare_exchange(
            self.exchange_name,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )

    async def publish(self, routing_key: str, payload: dict) -> None:
        if not self._exchange:
            raise RuntimeError("Publisher is not connected")

        message = aio_pika.Message(
            body=json.dumps(payload).encode("utf-8"),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await self._exchange.publish(message, routing_key=routing_key)

    async def close(self) -> None:
        if self._connection:
            await self._connection.close()
