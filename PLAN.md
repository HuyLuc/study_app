# Kế hoạch thực thi: Optimal Learning App

## Tổng quan

Dự án xây dựng ứng dụng học tập gamified theo triết lý **"20 giờ chinh phục kỹ năng"**, sử dụng các cơ chế tâm lý (streak, variable reward, micro-tasks, deep work) để biến việc học thành thói quen bền vững.

**Stack:** FastAPI · PostgreSQL · Redis · RabbitMQ · React + TypeScript + Vite · Docker Compose

**Kiến trúc:** Microservices — 5 services độc lập giao tiếp qua REST (internal) và RabbitMQ (events)

## Tiến độ thực thi (cập nhật)

- [x] Giai đoạn 1.1 — Auth Service (JWT + refresh rotation + Redis blacklist/whitelist + Alembic migration `auth.users`)
- [x] Giai đoạn 1.2 — API Gateway (proxy route map + verify JWT qua Auth internal endpoint + rate limit Redis)
- [x] Giai đoạn 1.3 — Shared contracts (`shared/events/schemas.py`, `shared/schemas/auth.py`)
- [x] Giai đoạn 1.4 — Database schema đầy đủ cho tất cả services (đã bootstrap schema + hoàn tất migration cho `auth`, `learning`, `gamification`, `notification`)
- [x] Giai đoạn 1.5 — Authentication flow giữa services (Gateway verify token và inject `X-User-Id`, `X-User-Email`)
- [x] Giai đoạn 1.6 — Edge cases toàn hệ thống (đã xử lý edge cases cho Auth + Learning + Gamification, bao gồm scheduled streak-at-risk flow)
- [x] Giai đoạn 2.1 — Skill Deconstruction (Skill/SubSkill/Task APIs)
- [x] Giai đoạn 2.2 — Commitment System (Create/Get/Abandon + progress cập nhật khi end session)
- [x] Giai đoạn 2.3 — Pomodoro Deep Work Session (Start/Log/End/List + publish `session.completed`)
- [x] Giai đoạn 2.4 — Flashcard System (Create/List/Review/Stats + SM-2 scheduling)
- [x] Giai đoạn 2.5 — Error Journal (Create/List/Get/Update)
- [x] Giai đoạn 3.1 — Streak System (consumer `session.completed` + API streak/freeze/calendar)
- [x] Giai đoạn 3.2 — Variable Reward / Loot Box (RNG theo `user_id + session_id` + reward history/pool)
- [x] Giai đoạn 3.3 — XP & Level System (XP gain từ session + level formula + leaderboard/profile)
- [x] Giai đoạn 3.4 — Badge System (unlock theo session/streak + API badges/all)
- [x] Giai đoạn 4 — Notification Service (event consumers + in-app notifications + preferences + scheduled streak-at-risk publish)
- [x] Giai đoạn 5 — Frontend React (auth, onboarding, dashboard, pomodoro, flashcard, journal, profile)
- [x] Giai đoạn 5.1 — Frontend API/State flow (API client + auth refresh retry + integrated service calls)
- [x] Giai đoạn 5.2 — Apple-style UI polish (focus overlay tối giản + flashcard reveal + loot capsule interaction)
- [x] Giai đoạn 6.1 — Unit test foundation (SM-2 + streak/level logic)

- [x] Sprint 1 (phần Foundation đã triển khai)
- [x] Sprint 2
- [x] Sprint 3
- [x] Sprint 4
- [x] Sprint 5
- [x] Sprint 6
- [x] Sprint 7 (Testing baseline + UI polish)

---

## Sơ đồ kiến trúc

```
Web Client (React)
      │
      ▼
API Gateway :8000   ←→   Redis (session cache / rate limit)
      │
      ├──► Auth Service :8001          → PostgreSQL (schema: auth)
      ├──► Learning Service :8002      → PostgreSQL (schema: learning)
      ├──► Gamification Service :8003  → PostgreSQL (schema: gamification) + Redis (streak)
      └──► Notification Service :8004  → PostgreSQL (schema: notification)

RabbitMQ (event bus)
  - session.completed      (Learning → Gamification, Notification)
  - streak.at_risk         (Gamification → Notification)
  - badge.unlocked         (Gamification → Notification)
  - reward.granted         (Gamification → Notification)
```

---

## Giai đoạn 1 — Nền tảng (Foundation)

> Mục tiêu: Mọi service chạy được, xác thực JWT hoạt động, gateway proxy đúng.

### 1.1 Auth Service ✅ Hoàn thành

**Domain entities:**
- `User`: id, email, hashed_password, display_name, created_at, is_active

**Use cases:**
- `RegisterUser` — validate email unique, hash password, tạo user
- `LoginUser` — verify password, phát JWT access token + refresh token
- `RefreshToken` — xác thực refresh token (lưu Redis), phát access token mới
- `LogoutUser` — blacklist refresh token trong Redis

**API endpoints:**
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

**Infrastructure:**
- PostgreSQL (SQLAlchemy async + Alembic migration)
- Redis: lưu refresh token whitelist, blacklist token sau logout
- python-jose (JWT) + bcrypt (password hash)

---

### 1.2 API Gateway ✅ Hoàn thành

- Proxy tất cả request đến đúng service (httpx async)
- Middleware xác thực JWT: inject `X-User-Id`, `X-User-Email` vào header downstream
- Rate limiting per user (Redis)
- Route map:
  ```
  /auth/**         → auth-service:8000
  /skills/**       → learning-service:8000
  /sessions/**     → learning-service:8000
  /flashcards/**   → learning-service:8000
  /gamification/** → gamification-service:8000
  /notifications/** → notification-service:8000
  ```

---

### 1.3 Shared contracts ✅ Hoàn thành

- Thư mục `shared/`: Pydantic schemas dùng chung, RabbitMQ event schemas
- Event types định nghĩa rõ ràng để các service không coupling trực tiếp

---

### 1.4 Database Schema chi tiết ✅ Hoàn thành

> Mỗi service dùng **1 schema riêng** trong cùng PostgreSQL instance. Alembic migration chạy riêng trong từng service.

**Schema: `auth`**
```sql
CREATE TABLE auth.users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_email ON auth.users(email);
```

**Schema: `learning`**
```sql
CREATE TABLE learning.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- reference auth.users.id (cross-schema, no FK)
    name VARCHAR(200) NOT NULL,
    description TEXT,
    target_hours INT DEFAULT 20,
    total_hours_logged FLOAT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active/completed/paused
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE learning.sub_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES learning.skills(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    is_core BOOLEAN DEFAULT FALSE,
    order_index INT DEFAULT 0
);

CREATE TABLE learning.learning_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_skill_id UUID REFERENCES learning.sub_skills(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    estimated_minutes INT DEFAULT 5,
    is_micro_task BOOLEAN DEFAULT TRUE,  -- estimated_minutes <= 5
    is_completed BOOLEAN DEFAULT FALSE
);

CREATE TABLE learning.skill_commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    skill_id UUID REFERENCES learning.skills(id),
    committed_at TIMESTAMPTZ,
    target_hours INT DEFAULT 5,
    hours_completed FLOAT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending'  -- pending/committed/completed/abandoned
);

CREATE TABLE learning.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    skill_id UUID REFERENCES learning.skills(id),
    task_id UUID REFERENCES learning.learning_tasks(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    pomodoros_completed INT DEFAULT 0,
    total_focus_minutes FLOAT DEFAULT 0,
    focus_duration INT DEFAULT 50,
    break_duration INT DEFAULT 10,
    status VARCHAR(20) DEFAULT 'active'  -- active/completed/interrupted
);

CREATE TABLE learning.pomodoro_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES learning.study_sessions(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL,  -- focus / break
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    completed BOOLEAN DEFAULT FALSE
);

CREATE TABLE learning.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    skill_id UUID REFERENCES learning.skills(id),
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE learning.flashcard_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES learning.flashcards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    reviewed_at TIMESTAMPTZ DEFAULT now(),
    difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
    interval_days INT DEFAULT 1,       -- SM-2: số ngày đến lần review tiếp
    easiness_factor FLOAT DEFAULT 2.5, -- SM-2: hệ số dễ
    repetitions INT DEFAULT 0,         -- SM-2: số lần review liên tiếp đúng
    next_review_at TIMESTAMPTZ
);

CREATE TABLE learning.error_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    skill_id UUID REFERENCES learning.skills(id),
    session_id UUID REFERENCES learning.study_sessions(id),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    lesson_learned TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Schema: `gamification`**
```sql
CREATE TABLE gamification.user_game_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    total_xp INT DEFAULT 0,
    level INT DEFAULT 1,
    title VARCHAR(100) DEFAULT 'Người mới bắt đầu',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE gamification.user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_activity_date DATE,
    freeze_count INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE gamification.reward_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,    -- xp_bonus/badge/cosmetic/streak_freeze/lucky
    rarity VARCHAR(20) NOT NULL,  -- common/rare/epic/legendary
    value INT DEFAULT 0,          -- XP amount nếu type=xp_bonus
    probability_weight INT DEFAULT 60
);

CREATE TABLE gamification.user_reward_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reward_id UUID REFERENCES gamification.reward_items(id),
    received_at TIMESTAMPTZ DEFAULT now(),
    source_session_id UUID  -- reference learning.study_sessions (cross-schema, no FK)
);

CREATE TABLE gamification.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    condition_type VARCHAR(50) NOT NULL,  -- streak_days/sessions_count/hours_total/flashcards_count/journal_count
    condition_value INT NOT NULL
);

CREATE TABLE gamification.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    badge_id UUID REFERENCES gamification.badges(id),
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_id)
);
```

**Schema: `notification`**
```sql
CREATE TABLE notification.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,  -- session_completed/streak_at_risk/badge_unlocked/reward_granted/level_up
    title VARCHAR(300) NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON notification.notifications(user_id, is_read);

CREATE TABLE notification.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    channel VARCHAR(20) NOT NULL,  -- in_app/email/push
    type VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, channel, type)
);
```

---

### 1.5 Authentication flow giữa các services ✅ Hoàn thành

> Quy tắc rõ ràng để tránh confusion khi implement.

**Nguyên tắc:**
- **API Gateway** là điểm duy nhất kiểm tra JWT với Auth Service
- Các service downstream **KHÔNG** verify JWT, chỉ tin tưởng header từ Gateway
- Gateway inject 2 header vào mọi request downstream: `X-User-Id` và `X-User-Email`

**Flow chi tiết:**
```
Client → Gateway (Bearer token)
   │
   ├─ Gateway gọi Auth Service: GET /internal/verify-token
   │     Response: { user_id, email, is_active }
   │
   ├─ Nếu invalid/expired → trả 401 cho client ngay
   │
   └─ Nếu valid → forward request đến service đích
         với header: X-User-Id: <uuid>, X-User-Email: <email>
```

**Internal endpoint (không expose ra ngoài):**
```
GET /internal/verify-token
Header: Authorization: Bearer <token>
Response: { "user_id": "uuid", "email": "...", "is_active": true }
```

**Route không cần auth** (Gateway whitelist):
```
POST /auth/register
POST /auth/login
POST /auth/refresh
GET  /health
```

---

### 1.6 Edge Cases quan trọng ✅ Hoàn thành

**Auth Service:**
- Email đăng ký không phân biệt hoa/thường → lowercase trước khi lưu
- Refresh token chỉ dùng được 1 lần (rotate sau mỗi lần refresh)
- Access token TTL: 15 phút | Refresh token TTL: 7 ngày

**Learning Service:**
- User đang có `active` session → gọi `StartSession` lần nữa → trả lỗi 409, không tạo mới
- `EndSession` với session không thuộc user hiện tại → 403
- Streak tính theo **UTC+7 (Việt Nam)** — midnight reset lúc 00:00 ICT
- `total_hours_logged` trong Skill tự động cộng dồn khi EndSession publish event

**Gamification Service:**
- Nếu `last_activity_date` là hôm qua → streak +1
- Nếu `last_activity_date` là hôm nay → không thay đổi (idempotent)
- Nếu `last_activity_date` cách hơn 1 ngày → streak về 0
- Level up không xảy ra ngược lại dù XP bị trừ (không có tính năng trừ XP)
- RNG reward: dùng seed từ `(user_id + session_id)` để reproducible nếu cần debug

---

## Giai đoạn 2 — Core Learning

> Tương ứng User Journey Bước 1–3: Thiết lập kỹ năng, Cam kết, Phiên Deep Work.

### 2.1 Skill Deconstruction (Bẻ khóa kỹ năng)

**Domain entities:**
- `Skill`: id, user_id, name, description, target_hours=20, status
- `SubSkill`: id, skill_id, name, is_core (thuộc top 20% cốt lõi hay không)
- `LearningTask`: id, sub_skill_id, title, estimated_minutes, is_micro_task

**Use cases:**
- `CreateSkill` — tạo kỹ năng mới, bắt buộc phân rã ngay
- `DeconstructSkill` — thêm sub-skills, đánh dấu core/non-core
- `GenerateMicroTasks` — tự động gợi ý micro-tasks (≤5 phút) từ sub-skill

**API:**
```
POST   /api/v1/skills
GET    /api/v1/skills
GET    /api/v1/skills/{skill_id}
PUT    /api/v1/skills/{skill_id}
POST   /api/v1/skills/{skill_id}/sub-skills
PUT    /api/v1/skills/{skill_id}/sub-skills/{sub_skill_id}
POST   /api/v1/skills/{skill_id}/tasks
```

---

### 2.2 Commitment System (Cam kết 5 giờ đầu)

**Domain entities:**
- `SkillCommitment`: id, user_id, skill_id, committed_at, target_hours=5, status (pending/committed/completed/abandoned)

**Use cases:**
- `CreateCommitment` — user "ký" cam kết, hiển thị cảnh báo "The Valley of Frustration"
- `CheckCommitmentProgress` — tính % tiến độ so với 5 giờ cam kết
- `AbandonCommitment` — ghi nhận bỏ cuộc (không xóa, để phân tích)

**API:**
```
POST /api/v1/skills/{skill_id}/commitment
GET  /api/v1/skills/{skill_id}/commitment
PUT  /api/v1/skills/{skill_id}/commitment/abandon
```

---

### 2.3 Pomodoro Deep Work Session

**Domain entities:**
- `StudySession`: id, user_id, skill_id, task_id, started_at, ended_at, pomodoros_completed, total_focus_minutes, status (active/completed/interrupted)
- `PomodoroLog`: id, session_id, type (focus/break), started_at, ended_at, completed

**Use cases:**
- `StartSession` — khởi tạo session, phát event bắt đầu
- `LogPomodoro` — ghi nhận từng chu kỳ 50/10 phút
- `EndSession` — tính tổng thời gian, publish event `session.completed`
- `GetSessionHistory` — lịch sử các phiên học

**Config mặc định:** 50 phút focus / 10 phút break (có thể tuỳ chỉnh)

**API:**
```
POST /api/v1/sessions/start
POST /api/v1/sessions/{session_id}/pomodoro
POST /api/v1/sessions/{session_id}/end
GET  /api/v1/sessions
GET  /api/v1/sessions/{session_id}
```

---

### 2.4 Flashcard System

**Domain entities:**
- `Flashcard`: id, user_id, skill_id, front, back, created_at
- `FlashcardReview`: id, card_id, user_id, reviewed_at, difficulty (1-5), next_review_at (SM-2)

**Use cases:**
- `CreateFlashcard` — tạo thẻ ghi nhớ cho một kỹ năng
- `ReviewFlashcard` — user đánh giá độ khó → tính next_review_at theo SM-2
- `GetDueCards` — lấy các thẻ đến hạn ôn tập hôm nay

**Spaced Repetition:** Thuật toán SM-2 đơn giản (interval, easiness factor)

**API:**
```
POST /api/v1/flashcards
GET  /api/v1/flashcards?skill_id=...&due=today
POST /api/v1/flashcards/{card_id}/review
GET  /api/v1/flashcards/stats
```

---

### 2.5 Error Journal (Nhật ký lỗi sai)

**Domain entities:**
- `ErrorEntry`: id, user_id, skill_id, session_id, title, description, lesson_learned, created_at

**Use cases:**
- `AddErrorEntry` — ghi lại lỗi sai sau phiên học
- `GetErrorJournal` — xem lại toàn bộ nhật ký theo kỹ năng

**API:**
```
POST /api/v1/journal
GET  /api/v1/journal?skill_id=...
GET  /api/v1/journal/{entry_id}
PUT  /api/v1/journal/{entry_id}
```

---

## Giai đoạn 3 — Gamification Engine

> Trái tim của app — tương ứng User Journey Bước 4–5.

### 3.1 Streak System

**Domain entities:**
- `UserStreak`: id, user_id, current_streak, longest_streak, last_activity_date, freeze_count (số lần được bỏ qua)

**Logic:**
- Mỗi ngày có ít nhất 1 session hoàn thành → streak +1
- Bỏ lỡ 1 ngày → streak về 0 (gây "nỗi sợ mất mát")
- `Streak Freeze`: user có thể dùng 1 lần bảo vệ streak (mua bằng XP)

**Use cases:**
- `UpdateStreak` — consumer của event `session.completed`, cập nhật streak
- `CheckStreakAtRisk` — cron job 8 PM mỗi ngày, publish `streak.at_risk` nếu chưa học
- `UseStreakFreeze` — tiêu XP để bảo vệ streak

**API:**
```
GET  /api/v1/gamification/streak
POST /api/v1/gamification/streak/freeze
GET  /api/v1/gamification/streak/calendar   ← lịch streak dạng GitHub contribution
```

---

### 3.2 Variable Reward / Loot Box

**Domain entities:**
- `RewardItem`: id, name, type (xp_bonus/badge/cosmetic/streak_freeze/lucky), rarity (common/rare/epic/legendary), probability_weight
- `UserRewardHistory`: id, user_id, reward_id, received_at, source_session_id

**Logic RNG:**
- Sau mỗi session hoàn thành → roll 1 lần
- Probability weight: common 60%, rare 25%, epic 12%, legendary 3%
- Nếu roll vào "lucky" → random nhân đôi XP phiên đó

**Use cases:**
- `RollReward` — consumer của `session.completed`, thực hiện roll và lưu kết quả
- `GetRewardHistory` — lịch sử phần thưởng đã nhận
- `GetRewardPool` — danh sách phần thưởng có thể nhận được

**API:**
```
GET /api/v1/gamification/rewards/history
GET /api/v1/gamification/rewards/pool
```

---

### 3.3 XP & Level System

**Domain entities:**
- `UserGameProfile`: id, user_id, total_xp, level, title, created_at

**Công thức lên cấp:** `xp_required = level * 100 + (level - 1) * 50`

**XP Sources:**
| Hành động | XP |
|---|---|
| Hoàn thành 1 Pomodoro | 10 XP |
| Hoàn thành session đầy đủ | 30 XP |
| Review flashcard (correct) | 5 XP |
| Streak milestone (7/30/100 ngày) | 50/200/500 XP |
| Hoàn thành 5 giờ cam kết | 100 XP |

**Use cases:**
- `AddXP` — cộng XP và kiểm tra level up
- `GetUserProfile` — lấy XP, level, title hiện tại

**API:**
```
GET /api/v1/gamification/profile
GET /api/v1/gamification/leaderboard
```

---

### 3.4 Badge / Achievement System

**Domain entities:**
- `Badge`: id, name, description, icon, condition_type, condition_value
- `UserBadge`: id, user_id, badge_id, unlocked_at

**Badges mặc định:**

| Badge | Điều kiện |
|---|---|
| "Khởi đầu" | Hoàn thành phiên học đầu tiên |
| "Kiên trì 7 ngày" | Streak 7 ngày liên tục |
| "Vượt thung lũng" | Hoàn thành 5 giờ cam kết đầu tiên |
| "Thám tử ký ức" | Tạo 20 flashcards |
| "Nhà phân tích" | Viết 10 error journal entries |
| "Chinh phục 20 giờ" | Đạt đủ 20 giờ cho 1 kỹ năng |
| "Huyền thoại" | Streak 100 ngày |

**Use cases:**
- `CheckAndUnlockBadges` — chạy sau mỗi event quan trọng, kiểm tra điều kiện
- `GetUserBadges` — danh sách badges đã mở khóa

**API:**
```
GET /api/v1/gamification/badges
GET /api/v1/gamification/badges/all   ← kể cả chưa unlock (để xem tiến độ)
```

---

## Giai đoạn 4 — Notification Service

> Giữ chân người dùng qua push / in-app / email notifications.

**Domain entities:**
- `Notification`: id, user_id, type, title, body, is_read, created_at
- `NotificationPreference`: id, user_id, channel (in_app/email/push), type, enabled

**Consumers (RabbitMQ):**

| Event nhận | Hành động |
|---|---|
| `session.completed` | "Tuyệt vời! Bạn vừa hoàn thành một phiên học." |
| `streak.at_risk` | "Streak X ngày của bạn sắp bị mất! Học ngay thôi." |
| `badge.unlocked` | "Bạn vừa mở khóa badge [tên badge]!" |
| `reward.granted` | "Bạn nhận được [phần thưởng] từ loot box!" |
| `level.up` | "Chúc mừng! Bạn lên cấp [N]!" |

**Scheduled jobs:**
- 20:00 mỗi ngày: kiểm tra user nào chưa học → publish `streak.at_risk`
- Thứ 2 hàng tuần: gửi email tóm tắt tuần (tổng XP, streak, tiến độ kỹ năng)

**API:**
```
GET  /api/v1/notifications
POST /api/v1/notifications/{id}/read
POST /api/v1/notifications/read-all
GET  /api/v1/notifications/preferences
PUT  /api/v1/notifications/preferences
```

---

## Giai đoạn 4.1 — RabbitMQ Event Contracts

> Định nghĩa rõ payload của từng event để các service không bị lệch nhau.

```python
# shared/events/schemas.py

class SessionCompletedEvent(BaseModel):
    event_type: str = "session.completed"
    user_id: str
    session_id: str
    skill_id: str
    total_focus_minutes: float
    pomodoros_completed: int
    completed_at: str  # ISO 8601

class StreakAtRiskEvent(BaseModel):
    event_type: str = "streak.at_risk"
    user_id: str
    current_streak: int
    last_activity_date: str  # ISO date

class BadgeUnlockedEvent(BaseModel):
    event_type: str = "badge.unlocked"
    user_id: str
    badge_id: str
    badge_name: str
    unlocked_at: str

class RewardGrantedEvent(BaseModel):
    event_type: str = "reward.granted"
    user_id: str
    reward_name: str
    rarity: str
    value: int
    source_session_id: str

class LevelUpEvent(BaseModel):
    event_type: str = "level.up"
    user_id: str
    old_level: int
    new_level: int
    new_title: str
```

**RabbitMQ topology:**
```
Exchange: study_app.events  (type: topic)

Routing keys:
  session.completed   → queue: gamification.session_handler
                      → queue: notification.session_handler

  streak.at_risk      → queue: notification.streak_handler

  badge.unlocked      → queue: notification.badge_handler

  reward.granted      → queue: notification.reward_handler

  level.up            → queue: notification.level_handler
```

---

## Giai đoạn 5 — Frontend React

> UI/UX: Màn hình thiết lập sặc sỡ như mạng xã hội. Màn hình Pomodoro tối giản, gam màu ấm.

**Stack:** React 18 + TypeScript + Vite + TailwindCSS + Zustand + TanStack Query

### Các màn hình chính:

**Onboarding & Skill Setup:**
- Màn hình chào: giải thích triết lý 20 giờ
- Wizard tạo kỹ năng → phân rã sub-skills → chọn core 20%
- Màn hình "Ký cam kết 5 giờ" với visual cảnh báo Valley of Frustration

**Dashboard (Home):**
- Streak calendar (dạng GitHub contribution graph)
- XP bar + level + title
- Kỹ năng đang học (tiến độ %)
- Badges gần đây mở khóa
- Nút "Bắt đầu học ngay" (Micro-task với 1 click)

**Màn hình Pomodoro (Deep Work Mode):**
- Giao diện tối giản tuyệt đối — chỉ hiển thị tên task + timer
- Gam màu ấm (vàng/cam) khi focus, xanh nhạt khi break
- Âm thanh "ting" khi hết pomodoro
- Không có navigation, không có distraction

**Màn hình kết thúc session:**
- Tóm tắt: số pomodoro, tổng thời gian, XP kiếm được
- Animation mở Loot Box → reveal phần thưởng ngẫu nhiên
- Redirect đến Flashcard review

**Flashcard Review:**
- Flip card animation
- Rating difficulty (1-5)
- Âm thanh "ting" khi trả lời đúng
- Progress bar số thẻ còn lại

**Error Journal:**
- Form thêm lỗi sai sau session
- List view theo kỹ năng, có thể filter

**Profile / Stats:**
- Tổng XP, level, all badges
- Biểu đồ thời gian học theo tuần/tháng
- Leaderboard (nếu có)

---

## Giai đoạn 5.1 — Frontend: State Management & API Layer

> Quy tắc rõ ràng để tránh "prop drilling" và duplicate fetch.

**Zustand stores (global state):**
```
authStore        — user info, access token, isAuthenticated
pomodoroStore    — timer state, current session, phase (focus/break)
notificationStore — unread count, latest notifications
```

**TanStack Query (server state):**
- Tất cả API call đi qua TanStack Query (cache, refetch, optimistic update)
- Zustand chỉ giữ state UI và auth token

**API client:**
- Axios instance với interceptor tự động đính `Authorization: Bearer <token>`
- Interceptor 401: tự động gọi `/auth/refresh`, retry request gốc 1 lần
- Nếu refresh thất bại → logout, redirect về `/login`

**Cấu trúc thư mục frontend:**
```
web/client/src/
├── api/           ← axios instance + từng service API
├── components/    ← UI components tái sử dụng
├── features/      ← feature-based folders (auth, skills, pomodoro, ...)
│   ├── auth/
│   ├── skills/
│   ├── pomodoro/
│   ├── flashcards/
│   ├── gamification/
│   └── notifications/
├── hooks/         ← custom hooks
├── stores/        ← Zustand stores
├── pages/         ← route-level components
└── types/         ← TypeScript types/interfaces
```

---

## Thứ tự thực thi (Timeline)

> Mỗi sprint kết thúc bằng 1 **Checkpoint** — chạy `docker compose up` và verify luồng end-to-end trước khi đi tiếp.

```
Sprint 1 (Giai đoạn 1)
├── Auth Service — Register/Login/JWT
├── API Gateway — Proxy + JWT middleware
└── Shared contracts + DB migrations setup

Sprint 2 (Giai đoạn 2A)
├── Learning Service — Skill + SubSkill + Task
├── Learning Service — Commitment System
└── Learning Service — Pomodoro Session

Sprint 3 (Giai đoạn 2B)
├── Learning Service — Flashcard + SM-2
└── Learning Service — Error Journal

Sprint 4 (Giai đoạn 3)
├── Gamification Service — Streak System
├── Gamification Service — XP + Level
├── Gamification Service — Variable Reward / Loot Box
└── Gamification Service — Badge System

Sprint 5 (Giai đoạn 4)
└── Notification Service — In-app + Scheduled jobs

Sprint 6 (Giai đoạn 5)
├── Frontend — Auth + Onboarding
├── Frontend — Dashboard + Skill Setup
├── Frontend — Pomodoro UI
├── Frontend — Session End + Loot Box
└── Frontend — Flashcard + Journal + Profile

Sprint 7 (Giai đoạn 5.2 + 6.1)
├── Frontend — Apple-style polish (focus overlay, flashcard reveal)
└── Backend — Unit test foundation cho SM-2 và gamification logic
```

**Checkpoint mỗi sprint:**
- Sprint 1: Đăng ký → đăng nhập → nhận JWT → gọi protected route qua Gateway thành công
- Sprint 2: Tạo skill → start session → end session → event `session.completed` được publish
- Sprint 3: Tạo flashcard → review → next_review_at được tính đúng theo SM-2
- Sprint 4: End session → streak tăng → XP cộng → badge check chạy → loot box roll
- Sprint 5: End session → notification in-app xuất hiện → 8PM không học → notification streak
- Sprint 6: Toàn bộ user journey từ onboarding → pomodoro → loot box → flashcard chạy trơn tru
- Sprint 7: Chạy unit tests cho SM-2 + streak/level, verify frontend focus overlay/flashcard reveal build pass

---

## Công nghệ chi tiết

| Layer | Tech |
|---|---|
| Backend framework | FastAPI (async) |
| ORM | SQLAlchemy 2.0 async + Alembic |
| Database | PostgreSQL 16 (mỗi service 1 schema) |
| Cache / Streak | Redis 7 |
| Message broker | RabbitMQ 3 (aio-pika) |
| Auth | python-jose (JWT) + passlib[bcrypt] |
| HTTP client (gateway) | httpx async |
| Spaced repetition | SM-2 algorithm (tự implement) |
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | TailwindCSS |
| State management | Zustand |
| Server state / cache | TanStack Query |
| Animation | Framer Motion (loot box, flip card) |
| Containerization | Docker Compose |
| Scheduled jobs | APScheduler (trong Notification Service) |

---

## Cấu trúc thư mục mục tiêu

```
study_app/
├── apps/
│   └── api-gateway/
├── services/
│   ├── auth-service/
│   ├── learning-service/
│   ├── gamification-service/
│   └── notification-service/
├── web/
│   └── client/                  ← React app
├── shared/
│   ├── events/                  ← RabbitMQ event schemas
│   └── schemas/                 ← Pydantic schemas dùng chung
├── infra/
│   └── scripts/
├── docker-compose.yml
└── PLAN.md
```

---

## Kế hoạch Testing

### Tổng quan chiến lược

```
Unit Tests      — Logic thuần túy, không cần DB/network (chạy nhanh)
Integration Tests — Test với DB/Redis thật, dùng Docker (chạy trong CI)
E2E Tests       — Luồng hoàn chỉnh từ HTTP request đến DB (chạy trước deploy)
```

**Tool:**
- Backend: `pytest` + `pytest-asyncio` + `httpx` (AsyncClient) + `pytest-cov`
- Database test: `testcontainers-python` (spin up PostgreSQL/Redis trong Docker khi test)
- Frontend: `Vitest` + `React Testing Library` + `MSW` (mock API)

---

### Unit Tests — Backend

> Không cần DB. Mock mọi dependency. Chạy cực nhanh.

**Auth Service — unit tests:**
```
tests/unit/
├── test_register_user.py
│   ├── test_register_success
│   ├── test_register_duplicate_email_raises_error
│   └── test_email_normalized_to_lowercase
├── test_login_user.py
│   ├── test_login_success_returns_tokens
│   ├── test_login_wrong_password_raises_error
│   └── test_login_inactive_user_raises_error
└── test_jwt.py
    ├── test_create_access_token_has_correct_expiry
    └── test_decode_expired_token_raises_error
```

**Learning Service — unit tests:**
```
tests/unit/
├── test_sm2_algorithm.py
│   ├── test_difficulty_1_decreases_interval
│   ├── test_difficulty_5_increases_interval
│   ├── test_first_review_sets_interval_1
│   └── test_easiness_factor_never_below_1_3
├── test_streak_logic.py  (pure function, không cần service)
│   ├── test_same_day_activity_no_change
│   ├── test_next_day_activity_increments_streak
│   ├── test_skipped_day_resets_streak_to_zero
│   └── test_streak_freeze_prevents_reset
└── test_commitment_progress.py
    ├── test_progress_percentage_calculation
    └── test_completed_status_when_target_reached
```

**Gamification Service — unit tests:**
```
tests/unit/
├── test_xp_level_calculation.py
│   ├── test_add_xp_updates_total
│   ├── test_level_up_triggered_at_correct_threshold
│   └── test_level_up_title_changes_correctly
├── test_rng_reward.py
│   ├── test_reward_rarity_within_probability_bounds
│   ├── test_roll_returns_valid_reward_item
│   └── test_lucky_reward_doubles_xp
└── test_badge_conditions.py
    ├── test_streak_badge_unlocks_at_7_days
    ├── test_first_session_badge_unlocks
    └── test_duplicate_badge_not_awarded
```

---

### Integration Tests — Backend

> Test với DB thật (testcontainers). Verify toàn bộ luồng của 1 use case.

**Cấu hình chung:**
```python
# conftest.py (mỗi service)
@pytest.fixture(scope="session")
async def postgres_container():
    # Spin up PostgreSQL container
    # Chạy Alembic migration
    # Yield connection string
    # Teardown container sau khi xong

@pytest.fixture
async def db_session(postgres_container):
    # Tạo transaction, rollback sau mỗi test (isolate)
    ...

@pytest.fixture
async def redis_client():
    # Dùng fakeredis cho unit, redis container cho integration
    ...
```

**Auth Service — integration tests:**
```
tests/integration/
├── test_auth_api.py
│   ├── test_register_and_login_full_flow
│   │   └── POST /register → POST /login → nhận JWT → GET /me thành công
│   ├── test_refresh_token_rotation
│   │   └── refresh lần 1 OK → dùng lại refresh token cũ → 401
│   └── test_logout_invalidates_token
│       └── logout → dùng lại access token → 401
```

**Learning Service — integration tests:**
```
tests/integration/
├── test_skill_flow.py
│   └── Tạo skill → thêm sub-skills → đánh dấu core → verify DB
├── test_session_flow.py
│   ├── Start session → log pomodoro → end session → verify total_focus_minutes
│   ├── Start session khi đã có active → 409 Conflict
│   └── End session → verify event published lên RabbitMQ
├── test_flashcard_sm2.py
│   └── Tạo card → review difficulty=2 → verify next_review_at = hôm nay + 1 ngày
│   └── Review lại difficulty=5 → verify interval tăng đúng SM-2
└── test_commitment_flow.py
    └── Tạo commitment → log 5h sessions → verify status = completed
```

**Gamification Service — integration tests:**
```
tests/integration/
├── test_streak_update.py
│   ├── Nhận event session.completed ngày 1 → streak = 1
│   ├── Nhận event ngày 2 → streak = 2
│   └── Bỏ ngày 3 → nhận event ngày 4 → streak = 1 (reset)
├── test_reward_roll.py
│   └── Nhận 100 events → verify phân phối rarity gần đúng tỷ lệ
└── test_badge_unlock.py
    └── Nhận event streak = 7 → verify badge "Kiên trì 7 ngày" được tạo
    └── Nhận event lần 2 streak = 7 → badge không duplicate
```

---

### E2E Tests

> Test toàn bộ stack đang chạy. Dùng `httpx` hoặc `playwright`.

**Backend E2E (tất cả services đang chạy):**
```
tests/e2e/
├── test_user_journey.py
│   ├── Đăng ký → đăng nhập → tạo skill → start session → end session
│   │   → verify streak = 1, XP > 0, notification xuất hiện
│   └── Tạo flashcard → review → next_review_at được set
└── test_streak_at_risk.py
    └── User không học → trigger cron job → verify notification được tạo
```

**Frontend E2E (Playwright):**
```
e2e/
├── auth.spec.ts
│   ├── Đăng ký account mới thành công
│   └── Đăng nhập → redirect về dashboard
├── skill_setup.spec.ts
│   └── Tạo skill → thêm sub-skills → ký cam kết → wizard hoàn tất
├── pomodoro.spec.ts
│   └── Start session → timer chạy → end session → loot box animation xuất hiện
└── flashcard.spec.ts
    └── Tạo flashcard → vào review mode → flip card → rate difficulty
```

---

### Testing trong từng Sprint

| Sprint | Tests cần viết |
|---|---|
| Sprint 1 | Unit: JWT, password hash. Integration: register/login/refresh flow |
| Sprint 2 | Unit: commitment progress. Integration: skill CRUD, session flow, event publish |
| Sprint 3 | Unit: SM-2 algorithm (quan trọng nhất). Integration: flashcard review flow |
| Sprint 4 | Unit: streak logic, RNG distribution, badge conditions. Integration: gamification consumers |
| Sprint 5 | Integration: notification consumers, cron job trigger |
| Sprint 6 | Frontend unit: components. E2E: full user journey |

---

### Coverage target

| Layer | Minimum coverage |
|---|---|
| Domain logic (entities, use cases) | 90% |
| Infrastructure (repos, DB) | 70% |
| API routes | 80% |
| Frontend components | 70% |

Chạy coverage report:
```bash
# Backend (trong từng service)
pytest --cov=app --cov-report=html tests/

# Frontend
npx vitest run --coverage
```
