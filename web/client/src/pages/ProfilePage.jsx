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
    <SectionShell title="Performance profile" subtitle="Track long-term momentum across levels, badges, rewards, and leaderboard.">
      <div className="metrics-grid">
        <MetricCard label="Level" value={profile ? profile.level : "-"} detail={profile?.title} />
        <MetricCard
          label="Total XP"
          value={profile ? profile.total_xp : "-"}
          detail={profile ? `${profile.xp_for_next_level} XP to next level` : "-"}
        />
        <MetricCard
          label="Longest streak"
          value={streak ? `${streak.longest_streak} days` : "-"}
          detail={streak ? `Current ${streak.current_streak}` : "-"}
        />
        <MetricCard
          label="Unlocked badges"
          value={badges.length}
          detail={`${allBadges.filter((item) => item.is_unlocked).length}/${allBadges.length}`}
        />
      </div>

      <div className="split-grid">
        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>Leaderboard</h3>
          </header>
          {leaderboard.length === 0 ? (
            <EmptyState title="No leaderboard data" description="Complete sessions to build ranking." />
          ) : (
            <ul className="list">
              {leaderboard.map((item, index) => (
                <li key={item.user_id} className="list__item">
                  <button type="button">
                    <span>
                      #{index + 1} · {item.user_id.slice(0, 8)}
                    </span>
                    <span className="muted">
                      {item.total_xp} XP · L{item.level}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>Reward history</h3>
          </header>
          {rewardsHistory.length === 0 ? (
            <EmptyState title="No rewards yet" description="Rewards appear after completed sessions." />
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
            <h3>Badges</h3>
          </header>
          {allBadges.length === 0 ? (
            <EmptyState title="No badges configured" />
          ) : (
            <ul className="list">
              {allBadges.map((item) => (
                <li key={item.id} className={item.is_unlocked ? "list__item is-active" : "list__item"}>
                  <button type="button">
                    <span>{item.name}</span>
                    <span className="muted">{item.is_unlocked ? "Unlocked" : "Locked"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>Reward pool + streak freeze</h3>
            <button type="button" className="chip" onClick={buyFreeze}>
              Buy freeze
            </button>
          </header>
          {rewardsPool.length === 0 ? (
            <EmptyState title="No rewards configured" />
          ) : (
            <ul className="list">
              {rewardsPool.map((item) => (
                <li key={item.id} className="list__item">
                  <button type="button">
                    <span>{item.name}</span>
                    <span className="muted">
                      {item.rarity} · weight {item.probability_weight}
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
          <h3>In-app notification preferences</h3>
        </header>
        {inAppPreferences.length === 0 ? (
          <EmptyState title="No preferences" />
        ) : (
          <div className="preferences-grid">
            {inAppPreferences.map((item) => (
              <button
                key={`${item.channel}-${item.type}`}
                type="button"
                className={item.enabled ? "chip chip--on" : "chip"}
                onClick={() => togglePreference(item)}
              >
                {item.type.replaceAll("_", " ")}: {item.enabled ? "on" : "off"}
              </button>
            ))}
          </div>
        )}
      </article>
    </SectionShell>
  );
}

export default ProfilePage;
