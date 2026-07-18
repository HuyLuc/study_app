import EmptyState from "../components/EmptyState";
import MetricCard from "../components/MetricCard";
import SectionShell from "../components/SectionShell";
import { formatDate } from "../utils/formatDate";

function ProfilePage({
  profile,
  streak,
  badges,
  allBadges,
  leaderboard,
  rewardsHistory,
  rewardsPool,
  buyFreeze,
  inAppPreferences,
  togglePreference,
}) {
  return (
    <SectionShell title="Hồ sơ hiệu suất" subtitle="Theo dõi phong độ học tập lâu dài thông qua cấp độ, danh hiệu, phần thưởng và bảng xếp hạng.">
      <div className="metrics-grid">
        <MetricCard label="Cấp độ" value={profile ? profile.level : "-"} detail={profile?.title} />
        <MetricCard
          label="Tổng XP"
          value={profile ? profile.total_xp : "-"}
          detail={profile ? `Còn ${profile.xp_for_next_level} XP để lên cấp` : "-"}
        />
        <MetricCard
          label="Chuỗi học kỷ lục"
          value={streak ? `${streak.longest_streak} ngày` : "-"}
          detail={streak ? `Hiện tại: ${streak.current_streak}` : "-"}
        />
        <MetricCard
          label="Danh hiệu đạt được"
          value={badges.length}
          detail={`${allBadges.filter((item) => item.is_unlocked).length}/${allBadges.length}`}
        />
      </div>

      <div className="split-grid">
        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>Bảng xếp hạng</h3>
          </header>
          {leaderboard.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu bảng xếp hạng" description="Hoàn thành các phiên học để tích lũy thứ hạng." />
          ) : (
            <ul className="list">
              {leaderboard.map((item, index) => (
                <li key={item.user_id} className="list__item">
                  <button type="button">
                    <span>
                      #{index + 1} · {item.user_id.slice(0, 8)}
                    </span>
                    <span className="muted">
                      {item.total_xp} XP · Cấp {item.level}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>Lịch sử phần thưởng</h3>
          </header>
          {rewardsHistory.length === 0 ? (
            <EmptyState title="Chưa có phần thưởng nào" description="Phần thưởng sẽ xuất hiện sau khi bạn hoàn thành phiên học." />
          ) : (
            <ul className="list">
              {rewardsHistory.slice(0, 8).map((item) => (
                <li key={item.id} className="list__item">
                  <button type="button">
                    <span>{item.reward_name}</span>
                    <span className="muted">
                      {item.rarity} · {formatDate(item.received_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <div className="split-grid">
        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>Danh hiệu</h3>
          </header>
          {allBadges.length === 0 ? (
            <EmptyState title="Chưa cấu hình danh hiệu nào" />
          ) : (
            <ul className="list">
              {allBadges.map((item) => (
                <li key={item.id} className={item.is_unlocked ? "list__item is-active" : "list__item"}>
                  <button type="button">
                    <span>{item.name}</span>
                    <span className="muted">{item.is_unlocked ? "Đã mở khóa" : "Chưa mở khóa"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>Kho phần thưởng & Streak Freeze</h3>
            <button type="button" className="chip" onClick={buyFreeze}>
              Mua lượt đóng băng
            </button>
          </header>
          {rewardsPool.length === 0 ? (
            <EmptyState title="Chưa cấu hình phần thưởng nào" />
          ) : (
            <ul className="list">
              {rewardsPool.map((item) => (
                <li key={item.id} className="list__item">
                  <button type="button">
                    <span>{item.name}</span>
                    <span className="muted">
                      {item.rarity} · Tỷ lệ {item.probability_weight}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="panel panel--soft">
        <header className="mini-header">
          <h3>Cài đặt thông báo ứng dụng</h3>
        </header>
        {inAppPreferences.length === 0 ? (
          <EmptyState title="Chưa có tùy chọn nào" />
        ) : (
          <div className="preferences-grid">
            {inAppPreferences.map((item) => (
              <button
                key={`${item.channel}-${item.type}`}
                type="button"
                className={item.enabled ? "chip chip--on" : "chip"}
                onClick={() => togglePreference(item)}
              >
                {item.type.replaceAll("_", " ")}: {item.enabled ? "bật" : "tắt"}
              </button>
            ))}
          </div>
        )}
      </article>
    </SectionShell>
  );
}

export default ProfilePage;
