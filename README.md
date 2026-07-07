# study_app

Foundation implementation for a microservices architecture using FastAPI (backend), React (frontend), and Docker Compose.

## Structure

- `apps/api-gateway`: API gateway service
- `services/*-service`: Domain microservices with clean architecture layers
- `web/client`: React web app (Vite)
- `shared`: Shared contracts and libraries
- `infra`: Infrastructure scripts and helpers

## Implemented in Foundation (Sprint 1)

- Auth service with:
  - Register/Login/Refresh/Logout/Me APIs
  - JWT access token (15m) + refresh token (7d)
  - Refresh token rotation and Redis whitelist/blacklist
  - Alembic migration for `auth.users`
- API Gateway with:
  - Service proxy routing
  - JWT verification through Auth internal endpoint
  - Header injection: `X-User-Id`, `X-User-Email`
  - Redis rate limiting per user
- Shared contracts:
  - RabbitMQ event schemas (`shared/events/schemas.py`)
  - Auth context schemas (`shared/schemas/auth.py`)
- Postgres schema bootstrap (`infra/postgres/init.sql`)

## Run

```bash
docker compose up --build
```

## Local URLs

- Web client: `http://localhost:5173`
- API gateway docs: `http://localhost:8000/docs`
- Auth service docs: `http://localhost:8001/docs`
- Learning service docs: `http://localhost:8002/docs`
- Gamification service docs: `http://localhost:8003/docs`
- Notification service docs: `http://localhost:8004/docs`
- RabbitMQ UI: `http://localhost:15672` (`guest` / `guest`)
