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
    <SectionShell title="Chế độ làm việc sâu" subtitle="Bắt đầu phiên làm việc, ghi nhận các chu kỳ tập trung và nhận phần thưởng học tập.">
      <div className="split-grid">
        <form className="panel panel--soft form-stack" onSubmit={startSession}>
          <h3>Bắt đầu phiên học</h3>
          <label>
            Kỹ năng
            <select value={selectedSkillId} onChange={(event) => setSelectedSkillId(event.target.value)} required>
              <option value="">Chọn kỹ năng</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Thời gian tập trung (phút)
            <input
              type="number"
              min="1"
              max="240"
              value={sessionForm.focus_duration}
              onChange={(event) => setSessionForm((prev) => ({ ...prev, focus_duration: Number(event.target.value) }))}
            />
          </label>
          <label>
            Thời gian giải lao (phút)
            <input
              type="number"
              min="1"
              max="120"
              value={sessionForm.break_duration}
              onChange={(event) => setSessionForm((prev) => ({ ...prev, break_duration: Number(event.target.value) }))}
            />
          </label>
          <button type="submit" className="button button--primary" disabled={!selectedSkillId || Boolean(activeSession)}>
            {activeSession ? "Đang trong phiên học" : "Bắt đầu phiên học"}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setFocusOverlayOpen(true)}
            disabled={!activeSession}
          >
            Vào chế độ tập trung
          </button>
          {activeSession ? (
            <div className="action-row">
              <button type="button" className="button" onClick={logFocusCycle}>
                Ghi nhận Pomodoro
              </button>
              <button type="button" className="button button--primary" onClick={endSession}>
                Kết thúc phiên học
              </button>
            </div>
          ) : null}
        </form>

        <div className="stacked-panels">
          <article className="panel panel--soft">
            <h3>Phiên hiện tại</h3>
            {activeSession ? (
              <div className="session-live">
                <p>
                  <strong>Bắt đầu:</strong> {formatDate(activeSession.started_at)}
                </p>
                <p>
                  <strong>Số Pomodoro đã xong:</strong> {activeSession.pomodoros_completed}
                </p>
                <p>
                  <strong>Thời gian tập trung:</strong> {activeSession.total_focus_minutes.toFixed(1)} phút
                </p>
              </div>
            ) : (
              <EmptyState title="Không có phiên học nào hoạt động" description="Hãy bắt đầu một phiên học để tập trung sâu." />
            )}
          </article>

          <article className="panel panel--soft">
            <h3>Kết quả phiên trước</h3>
            {sessionSummary ? (
              <div className="session-live">
                <p>
                  <strong>Thời gian tập trung:</strong> {sessionSummary.total_focus_minutes.toFixed(1)} phút
                </p>
                <p>
                  <strong>Số Pomodoro hoàn thành:</strong> {sessionSummary.pomodoros_completed}
                </p>
                <p>
                  <strong>Trạng thái:</strong> {sessionSummary.status}
                </p>
                <div
                  key={`${lootRevealSeed}-${latestReward?.id || "none"}`}
                  className={isLootRevealed ? "loot-card is-open" : "loot-card"}
                >
                  <p className="loot-card__label">Hộp quà may mắn</p>
                  <button type="button" className="loot-card__button" onClick={() => setIsLootRevealed((prev) => !prev)}>
                    {isLootRevealed
                      ? latestReward
                        ? `${latestReward.reward_name} · ${latestReward.rarity}`
                        : "Không nhận được phần thưởng"
                      : "Nhấn để mở quà"}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState title="Chưa có dữ liệu phiên trước" description="Kết thúc phiên học để xem tóm tắt và nhận thưởng." />
            )}
          </article>
        </div>
      </div>

      <article className="panel panel--soft">
        <header className="mini-header">
          <h3>Lịch sử phiên học</h3>
        </header>
        {sessions.length === 0 ? (
          <EmptyState title="Chưa có phiên học nào" description="Hãy thực hiện phiên học tập trung đầu tiên của bạn." />
        ) : (
          <ul className="list">
            {sessions.slice(0, 8).map((item) => (
              <li key={item.id} className="list__item">
                <button type="button">
                  <span>{formatDate(item.started_at)}</span>
                  <span className="muted">
                    {item.total_focus_minutes.toFixed(1)} phút · {item.status}
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
