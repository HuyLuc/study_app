import EmptyState from "../components/EmptyState";
import MetricCard from "../components/MetricCard";
import SectionShell from "../components/SectionShell";
import { formatDate } from "../utils/formatDate";

function DashboardPage({
  profile,
  streak,
  skills,
  selectedSkill,
  selectedSkillId,
  unreadNotifications,
  notifications,
  onSelectSkill,
  onOpenOnboarding,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
}) {
  return (
    <SectionShell
      title="Bảng điều khiển học tập"
      subtitle="Nơi quản lý chuỗi ngày học (streak), điểm kinh nghiệm (XP), tiến độ kỹ năng và thông báo."
      className="dashboard-page"
    >
      <div className="metrics-grid">
        <MetricCard
          label="Điểm XP hiện tại"
          value={profile ? profile.total_xp : "-"}
          detail={profile ? `Cấp ${profile.level} · ${profile.title}` : "Hồ sơ chưa sẵn sàng"}
        />
        <MetricCard
          label="Chuỗi học tập (Streak)"
          value={streak ? `${streak.current_streak} ngày` : "-"}
          detail={streak ? `Kỷ lục ${streak.longest_streak} · Freeze ${streak.freeze_count}` : "Chưa có dữ liệu streak"}
        />
        <MetricCard
          label="Kỹ năng đang học"
          value={skills.length}
          detail={selectedSkill ? `Đang chọn: ${selectedSkill.name}` : "Tạo kỹ năng đầu tiên"}
        />
        <MetricCard
          label="Thông báo chưa đọc"
          value={unreadNotifications.length}
          detail="Cập nhật mới từ hệ thống"
        />
      </div>

      <section className="dashboard-surface">
        <article className="dashboard-surface__column">
          <header className="mini-header">
            <h3>Kỹ năng</h3>
            <button type="button" className="chip" onClick={onOpenOnboarding}>
              Cài đặt
            </button>
          </header>
          {skills.length === 0 ? (
            <EmptyState
              title="Chưa có kỹ năng nào"
              description="Bắt đầu bằng một kỹ năng chính để hệ thống gợi ý lộ trình học."
              ctaLabel="Mở thiết lập kỹ năng"
              onCta={onOpenOnboarding}
            />
          ) : (
            <ul className="list">
              {skills.map((skill) => (
                <li key={skill.id} className={skill.id === selectedSkillId ? "list__item is-active" : "list__item"}>
                  <button type="button" onClick={() => onSelectSkill(skill.id)}>
                    <span>{skill.name}</span>
                    <span className="muted">
                      {skill.total_hours_logged.toFixed(1)}h / {skill.target_hours}h
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="dashboard-surface__column">
          <header className="mini-header">
            <h3>Thông báo</h3>
            <button type="button" className="chip" onClick={onMarkAllNotificationsRead}>
              Đọc tất cả
            </button>
          </header>
          {notifications.length === 0 ? (
            <EmptyState title="Không có thông báo" description="Hoàn thành các phiên học để kích hoạt sự kiện học tập." />
          ) : (
            <ul className="list">
              {notifications.slice(0, 6).map((item) => (
                <li key={item.id} className={item.is_read ? "list__item" : "list__item is-unread"}>
                  <button type="button" onClick={() => onMarkNotificationRead(item.id)}>
                    <span>{item.title}</span>
                    <span className="muted">{formatDate(item.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </SectionShell>
  );
}

export default DashboardPage;
