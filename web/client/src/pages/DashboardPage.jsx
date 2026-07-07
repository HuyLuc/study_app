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
    <SectionShell title="Learning cockpit" subtitle="One place for streak, XP, skill progress, and notifications.">
      <div className="metrics-grid">
        <MetricCard
          label="Current XP"
          value={profile ? profile.total_xp : "-"}
          detail={profile ? `Level ${profile.level} · ${profile.title}` : "Gamification profile unavailable."}
        />
        <MetricCard
          label="Current Streak"
          value={streak ? `${streak.current_streak} days` : "-"}
          detail={streak ? `Longest ${streak.longest_streak} · Freeze ${streak.freeze_count}` : "Streak engine idle."}
        />
        <MetricCard
          label="Active Skills"
          value={skills.length}
          detail={selectedSkill ? `Selected: ${selectedSkill.name}` : "Create your first skill to begin."}
        />
        <MetricCard
          label="Unread"
          value={unreadNotifications.length}
          detail="In-app notifications from events and streak monitor."
        />
      </div>

      <div className="split-grid">
        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>Skills</h3>
            <button type="button" className="chip" onClick={onOpenOnboarding}>
              Open setup
            </button>
          </header>
          {skills.length === 0 ? (
            <EmptyState title="No skills yet" description="Create your first skill in Skill Setup." />
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

        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>Notifications</h3>
            <button type="button" className="chip" onClick={onMarkAllNotificationsRead}>
              Mark all read
            </button>
          </header>
          {notifications.length === 0 ? (
            <EmptyState title="No notifications" description="Complete sessions to trigger gamification events." />
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
      </div>
    </SectionShell>
  );
}

export default DashboardPage;
