# Kế hoạch nâng cấp & tối ưu hóa hệ thống Study App

Kế hoạch này tập trung vào việc khắc phục các điểm yếu kiến trúc, tăng cường bảo mật và nâng cao tính chuyên nghiệp của hệ thống microservices hiện tại.

## User Review Required

> [!IMPORTANT]
> **Tách biệt Database (Database Isolation):**
> Chúng ta sẽ di chuyển logic quét streak hết hạn từ `notification-service` sang `gamification-service`. `notification-service` sẽ chỉ lắng nghe event `streak.at_risk` qua RabbitMQ thay vì kết nối và truy vấn trực tiếp vào database schema của service khác.

> [!WARNING]
> **Cấu hình Shared Package:**
> Để sử dụng lại các Pydantic model trong thư mục `shared/`, chúng ta sẽ đóng gói nó thành một local Python package và cấu hình lại các Dockerfile để cài đặt gói này trong quá trình build container.

---

## Open Questions

Không có câu hỏi mở tại thời điểm này. Nếu bạn có thêm yêu cầu cụ thể nào khác về thuật toán hoặc cấu hình, hãy phản hồi lại sau khi xem xét kế hoạch này.

---

## Proposed Changes

Các thay đổi được chia làm 5 giai đoạn chính để đảm bảo hệ thống nâng cấp mượt mà:

### Phase 1: Database Isolation (Tách biệt dữ liệu giữa các dịch vụ)

Di chuyển Scheduler quét streak sắp hết hạn từ `notification-service` sang đúng vị trí của nó ở `gamification-service`.

#### [MODIFY] [streak_scheduler.py](file:///f:/HuyLuc/study_app/services/gamification-service/app/infrastructure/jobs/streak_scheduler.py)
- Di chuyển logic check streak hàng ngày tại đây.
- Quét bảng `gamification.user_streaks` nội bộ và publish event `streak.at_risk` vào RabbitMQ.

#### [DELETE] [streak_scheduler.py](file:///f:/HuyLuc/study_app/services/notification-service/app/infrastructure/jobs/streak_scheduler.py)
- Xóa bỏ scheduler quét chéo schema này khỏi `notification-service`.

#### [MODIFY] [main.py](file:///f:/HuyLuc/study_app/services/notification-service/app/main.py)
- Gỡ bỏ cấu hình scheduler khỏi ứng dụng.

---

### Phase 2: Gateway Rate Limiting Enhancements (Nâng cấp Rate Limit)

Bảo vệ các route public (đăng nhập, đăng ký) bằng IP-based Rate Limiting.

#### [MODIFY] [rate_limit.py](file:///f:/HuyLuc/study_app/apps/api-gateway/app/core/rate_limit.py)
- Hỗ trợ thêm hàm `allow_ip(ip_address: str)` để limit theo địa chỉ IP của Client.

#### [MODIFY] [main.py](file:///f:/HuyLuc/study_app/apps/api-gateway/app/main.py)
- Cập nhật middleware: Nếu request thuộc public routes (như `/auth/login`, `/auth/register`), áp dụng rate limit dựa trên Client IP.
- Đối với authenticated routes, tiếp tục sử dụng `user_id` để rate limit.

---

### Phase 3: Đóng gói Shared Contract (`shared`)

Biến thư mục `shared/` thành một gói cài đặt cục bộ để các service import một cách tường minh và an toàn.

#### [NEW] [pyproject.toml](file:///f:/HuyLuc/study_app/shared/pyproject.toml)
- Khai báo metadata cho gói `study-shared` dùng chung.

#### [MODIFY] [Dockerfile](file:///f:/HuyLuc/study_app/services/auth-service/Dockerfile)
#### [MODIFY] [Dockerfile](file:///f:/HuyLuc/study_app/services/learning-service/Dockerfile)
#### [MODIFY] [Dockerfile](file:///f:/HuyLuc/study_app/services/gamification-service/Dockerfile)
#### [MODIFY] [Dockerfile](file:///f:/HuyLuc/study_app/services/notification-service/Dockerfile)
- Cập nhật Dockerfile để copy thư mục `shared/` và chạy lệnh `pip install -e /shared` (hoặc tương đương) trong container.

#### [MODIFY] [event_consumer.py](file:///f:/HuyLuc/study_app/services/notification-service/app/infrastructure/messaging/event_consumer.py)
- Sử dụng các Pydantic class từ `shared.events.schemas` để validate payload tự động thay vì dùng dict thuần.

---

### Phase 4: Request Tracing (Distributed Tracing)

Đưa `X-Request-ID` đi suốt vòng đời request để dễ dàng truy vết log.

#### [MODIFY] [main.py](file:///f:/HuyLuc/study_app/apps/api-gateway/app/main.py)
- Middleware tự động sinh ra một `uuid.uuid4()` làm Request ID nếu chưa có trong header.
- Forward header `X-Request-ID` xuống các service downstream.

#### [MODIFY] [logging setup / config](file:///f:/HuyLuc/study_app/services/auth-service/app/core/logging.py) (và các service khác)
- Đọc `X-Request-ID` từ header đầu vào và đính kèm nó vào định dạng log (Log Formatter) của service.

---

### Phase 5: Testing Baseline

Viết các integration test cơ bản cho luồng Auth và Event Bus.

#### [NEW] [test_auth_flow.py](file:///f:/HuyLuc/study_app/services/auth-service/tests/integration/test_auth_flow.py)
- Viết test luồng Register -> Login -> Refresh Token -> Logout.

#### [NEW] [test_event_integration.py](file:///f:/HuyLuc/study_app/services/notification-service/tests/integration/test_event_integration.py)
- Viết test kiểm tra Consumer của Notification nhận được event từ RabbitMQ và lưu vào DB.

---

## Verification Plan

### Automated Tests
Chúng ta sẽ chạy test suite của từng dịch vụ sau khi nâng cấp để đảm bảo tính hồi quy:
```bash
docker compose exec auth-service pytest tests/
docker compose exec learning-service pytest tests/
docker compose exec gamification-service pytest tests/
docker compose exec notification-service pytest tests/
```

### Manual Verification
1. **Kiểm tra Rate Limiting:** Dùng tool HTTP bench (như `ab` hoặc script Python đơn giản) gửi liên tục request tới `/auth/login` để xác nhận nhận được mã lỗi `429 Too Many Requests`.
2. **Kiểm tra Request Tracing:** Kiểm tra log stdout của docker compose để đảm bảo mỗi dòng log in ra đều đi kèm giá trị `X-Request-ID` đồng bộ giữa các dịch vụ cho một request duy nhất.
3. **Kiểm tra Streak Scheduler:** Giảm thời gian cron job kiểm tra streak xuống mỗi phút, thay đổi ngày hoạt động của user thủ công dưới DB về quá khứ và xác nhận nhận được in-app notification nhắc nhở về streak.
