import EmptyState from "../components/EmptyState";
import SectionShell from "../components/SectionShell";
import { formatDate } from "../utils/formatDate";

function PomodoroPage({
  selectedSkillId,
  setSelectedSkillId,
  skills,
  sessionForm,
  setSessionForm,
  startSession,
  activeSession,
  setFocusOverlayOpen,
  logFocusCycle,
  endSession,
  sessionSummary,
  lootRevealSeed,
  latestReward,
  isLootRevealed,
  setIsLootRevealed,
  sessions,
}) {
  return (
    <SectionShell title="Deep work mode" subtitle="Start session, log focus blocks, and end to trigger reward and streak updates.">
      <div className="split-grid">
        <form className="panel panel--soft form-stack" onSubmit={startSession}>
          <h3>Start session</h3>
          <label>
            Skill
            <select value={selectedSkillId} onChange={(event) => setSelectedSkillId(event.target.value)} required>
              <option value="">Select skill</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Focus duration (minutes)
            <input
              type="number"
              min="1"
              max="240"
              value={sessionForm.focus_duration}
              onChange={(event) => setSessionForm((prev) => ({ ...prev, focus_duration: Number(event.target.value) }))}
            />
          </label>
          <label>
            Break duration (minutes)
            <input
              type="number"
              min="1"
              max="120"
              value={sessionForm.break_duration}
              onChange={(event) => setSessionForm((prev) => ({ ...prev, break_duration: Number(event.target.value) }))}
            />
          </label>
          <button type="submit" className="button button--primary" disabled={!selectedSkillId || Boolean(activeSession)}>
            {activeSession ? "Session active" : "Start session"}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setFocusOverlayOpen(true)}
            disabled={!activeSession}
          >
            Enter focus view
          </button>
          {activeSession ? (
            <div className="action-row">
              <button type="button" className="button" onClick={logFocusCycle}>
                Log focus cycle
              </button>
              <button type="button" className="button button--primary" onClick={endSession}>
                End session
              </button>
            </div>
          ) : null}
        </form>

        <div className="stacked-panels">
          <article className="panel panel--soft">
            <h3>Live session</h3>
            {activeSession ? (
              <div className="session-live">
                <p>
                  <strong>Started:</strong> {formatDate(activeSession.started_at)}
                </p>
                <p>
                  <strong>Pomodoros:</strong> {activeSession.pomodoros_completed}
                </p>
                <p>
                  <strong>Focus minutes:</strong> {activeSession.total_focus_minutes.toFixed(1)}
                </p>
              </div>
            ) : (
              <EmptyState title="No active session" description="Start one to enter deep work mode." />
            )}
          </article>

          <article className="panel panel--soft">
            <h3>Last summary</h3>
            {sessionSummary ? (
              <div className="session-live">
                <p>
                  <strong>Focus minutes:</strong> {sessionSummary.total_focus_minutes.toFixed(1)}
                </p>
                <p>
                  <strong>Pomodoros:</strong> {sessionSummary.pomodoros_completed}
                </p>
                <p>
                  <strong>Status:</strong> {sessionSummary.status}
                </p>
                <div
                  key={`${lootRevealSeed}-${latestReward?.id || "none"}`}
                  className={isLootRevealed ? "loot-card is-open" : "loot-card"}
                >
                  <p className="loot-card__label">Loot capsule</p>
                  <button type="button" className="loot-card__button" onClick={() => setIsLootRevealed((prev) => !prev)}>
                    {isLootRevealed
                      ? latestReward
                        ? `${latestReward.reward_name} · ${latestReward.rarity}`
                        : "No reward this session"
                      : "Tap to reveal"}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState title="No completed session in this view" description="End a session to see summary and reward." />
            )}
          </article>
        </div>
      </div>

      <article className="panel panel--soft">
        <header className="mini-header">
          <h3>Session history</h3>
        </header>
        {sessions.length === 0 ? (
          <EmptyState title="No sessions yet" description="Start your first focused session." />
        ) : (
          <ul className="list">
            {sessions.slice(0, 8).map((item) => (
              <li key={item.id} className="list__item">
                <button type="button">
                  <span>{formatDate(item.started_at)}</span>
                  <span className="muted">
                    {item.total_focus_minutes.toFixed(1)} min · {item.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </SectionShell>
  );
}

export default PomodoroPage;
