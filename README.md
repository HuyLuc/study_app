# Study App

Ứng dụng học tập theo mô hình microservices, tập trung vào vòng lặp:

`Thiết lập kỹ năng -> Deep Work -> Gamification -> Ôn tập -> Duy trì streak`

Stack chính:
- Backend: FastAPI + SQLAlchemy + Alembic
- Frontend: React + Vite
- Infra: PostgreSQL + Redis + RabbitMQ + Docker Compose

## Mục lục

- [1. Kiến trúc tổng quan](#1-kiến-trúc-tổng-quan)
- [2. Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
- [3. Yêu cầu trước khi chạy](#3-yêu-cầu-trước-khi-chạy)
- [4. Chạy app nhanh bằng Docker](#4-chạy-app-nhanh-bằng-docker)
- [5. URL quan trọng](#5-url-quan-trọng)
- [6. Hướng dẫn sử dụng app (UI)](#6-hướng-dẫn-sử-dụng-app-ui)
- [7. Hướng dẫn gọi API qua Gateway](#7-hướng-dẫn-gọi-api-qua-gateway)
- [8. Chạy local không dùng Docker (tuỳ chọn)](#8-chạy-local-không-dùng-docker-tuỳ-chọn)
- [9. Biến môi trường](#9-biến-môi-trường)
- [10. Lệnh vận hành hữu ích](#10-lệnh-vận-hành-hữu-ích)
- [11. Troubleshooting](#11-troubleshooting)

## 1. Kiến trúc tổng quan

```text
Web Client (React, :5173)
        |
        v
API Gateway (:8000)
        |
        +--> Auth Service (:8001) --------+
        +--> Learning Service (:8002) ----+--> PostgreSQL (:5432, schema: auth/learning/gamification/notification)
        +--> Gamification Service (:8003)-+
        +--> Notification Service (:8004)-+
        |
        +--> Redis (:6379)
        +--> RabbitMQ (:5672, UI :15672)
```

Giao tiếp nội bộ:
- REST qua API Gateway
- Event bus qua RabbitMQ (`session.completed`, `reward.granted`, `badge.unlocked`, `level.up`, `streak.at_risk`)

## 2. Cấu trúc thư mục

```text
study_app/
├── apps/
│   └── api-gateway/
├── services/
│   ├── auth-service/
│   ├── learning-service/
│   ├── gamification-service/
│   └── notification-service/
├── web/
│   └── client/
├── shared/
│   ├── events/
│   └── schemas/
├── infra/
│   └── postgres/init.sql
├── docker-compose.yml
└── PLAN.md
```

## 3. Yêu cầu trước khi chạy

Tối thiểu:
- Docker Desktop (khuyến nghị bản mới)
- Git

Tuỳ chọn (nếu chạy không Docker):
- Python 3.12
- Node.js 20+
- PostgreSQL 16
- Redis 7
- RabbitMQ 3

## 4. Chạy app nhanh bằng Docker

### Bước 1: Clone project

```bash
git clone <repo-url>
cd study_app
```

### Bước 2: Build và chạy toàn bộ services

```bash
docker compose up -d --build
```

Lần chạy đầu sẽ mất vài phút do:
- kéo image postgres/redis/rabbitmq
- cài dependencies Python/Node
- chạy Alembic migration trong từng service

### Bước 3: Kiểm tra container

```bash
docker compose ps
```

Kỳ vọng tất cả container đều `Up`:
- `study-api-gateway`
- `study-auth-service`
- `study-learning-service`
- `study-gamification-service`
- `study-notification-service`
- `study-web-client`
- `study-postgres`
- `study-redis`
- `study-rabbitmq`

## 5. URL quan trọng

- Web app: `http://localhost:5173`
- API Gateway docs: `http://localhost:8000/docs`
- Auth docs: `http://localhost:8001/docs`
- Learning docs: `http://localhost:8002/docs`
- Gamification docs: `http://localhost:8003/docs`
- Notification docs: `http://localhost:8004/docs`
- RabbitMQ UI: `http://localhost:15672` (`guest` / `guest`)

## 6. Hướng dẫn sử dụng app (UI)

Sau khi mở `http://localhost:5173`:

1. Đăng ký tài khoản hoặc đăng nhập.
2. Vào `Skill Setup`:
   - tạo skill mới
   - thêm sub-skill
   - thêm micro-task
   - ký commitment
3. Vào `Pomodoro`:
   - start session
   - log focus cycle
   - end session để tạo `session.completed`
4. Vào `Flashcards`:
   - tạo flashcard
   - flip card
   - chấm difficulty 1..5 (SM-2)
5. Vào `Journal`:
   - ghi lại lỗi sai và bài học
6. Vào `Profile`:
   - xem XP/level/streak
   - leaderboard
   - badges/rewards
   - mua streak freeze
7. `Dashboard`:
   - xem notification và trạng thái học tổng quan

## 7. Hướng dẫn gọi API qua Gateway

Base URL:

```text
http://localhost:8000
```

### 7.1 Register

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"12345678","display_name":"Demo"}'
```

### 7.2 Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"12345678"}'
```

Lấy `access_token`, sau đó gọi protected API:

```bash
curl -X GET http://localhost:8000/skills \
  -H "Authorization: Bearer <access_token>"
```

### 7.3 Tạo skill

```bash
curl -X POST http://localhost:8000/skills \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Product Design","description":"Learn core UX","target_hours":20}'
```

### 7.4 Start session

```bash
curl -X POST http://localhost:8000/sessions/start \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"skill_id":"<skill_id>","focus_duration":50,"break_duration":10}'
```

## 8. Chạy local không dùng Docker (tuỳ chọn)

Khuyến nghị chỉ dùng khi bạn muốn debug sâu từng service.

Ví dụ cho 1 backend service:

```bash
cd services/auth-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Frontend:

```bash
cd web/client
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Nếu API Gateway không chạy Docker, cần đảm bảo các URL internal trong config trỏ đúng host local.

## 9. Biến môi trường

Mỗi service đã có `.env.example`. Mặc định code có fallback local, nhưng bạn nên tạo `.env` khi customize:

```bash
cp apps/api-gateway/.env.example apps/api-gateway/.env
cp services/auth-service/.env.example services/auth-service/.env
cp services/learning-service/.env.example services/learning-service/.env
cp services/gamification-service/.env.example services/gamification-service/.env
cp services/notification-service/.env.example services/notification-service/.env
```

Frontend có thể cấu hình API Gateway:

```bash
cd web/client
echo VITE_API_BASE_URL=http://localhost:8000 > .env
```

Biến quan trọng:
- Gateway: `AUTH_SERVICE_URL`, `LEARNING_SERVICE_URL`, `GAMIFICATION_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `REDIS_URL`
- Auth: `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`
- Các service backend: `POSTGRES_DSN`, `REDIS_URL`, `RABBITMQ_URL`

## 10. Lệnh vận hành hữu ích

Xem log realtime:

```bash
docker compose logs -f
```

Xem log 1 service:

```bash
docker compose logs -f api-gateway
docker compose logs -f auth-service
docker compose logs -f learning-service
docker compose logs -f gamification-service
docker compose logs -f notification-service
docker compose logs -f web-client
```

Dừng app:

```bash
docker compose down
```

Dừng và xoá volume DB (reset dữ liệu):

```bash
docker compose down -v
```

Chạy test unit đã có:

```bash
cd services/learning-service
pytest tests/unit -q

cd ../gamification-service
pytest tests/unit -q
```

## 11. Troubleshooting

### 1) Web mở được nhưng gọi API lỗi

Kiểm tra:
- Gateway đã chạy chưa (`docker compose ps`)
- `VITE_API_BASE_URL` có đúng không (mặc định `http://localhost:8000`)
- Log gateway có 401/503 không (`docker compose logs -f api-gateway`)

### 2) 401 Unauthorized liên tục

Nguyên nhân thường gặp:
- access token hết hạn
- refresh token không hợp lệ
- dùng token cũ sau logout

Giải pháp:
- login lại
- xoá localStorage của browser nếu cần

### 3) Service không lên do DB migration

```bash
docker compose logs -f auth-service
docker compose logs -f learning-service
docker compose logs -f gamification-service
docker compose logs -f notification-service
```

Các service backend chạy `alembic upgrade head` khi start, nếu migration lỗi sẽ crash container.

### 4) RabbitMQ UI không vào được

Đảm bảo container `study-rabbitmq` đang `Up` và port `15672` không bị chiếm.

---

Nếu bạn muốn, mình có thể bổ sung thêm mục `API Cheat Sheet` (copy-paste full flow từ register -> create skill -> start/end session -> xem streak/reward) ngay trong README.
