import { useEffect, useMemo, useState } from "react";

import CountdownDisplay from "../components/CountdownDisplay";
import EmptyState from "../components/EmptyState";
import SectionShell from "../components/SectionShell";
import { AMBIENT_TRACK_OPTIONS, CLOCK_STYLE_OPTIONS } from "../constants/focusExperience";
import { formatDate } from "../utils/formatDate";

function PomodoroPage({
  selectedSkillId,
  setSelectedSkillId,
  skills,
  sessionForm,
  setSessionForm,
  startSession,
  activeSession,
  focusClockStyle,
  setFocusClockStyle,
  focusMusicTrack,
  setFocusMusicTrack,
  focusMusicEnabled,
  setFocusMusicEnabled,
  focusMusicVolume,
  setFocusMusicVolume,
  enterFocusMode,
  logFocusCycle,
  endSession,
  sessionSummary,
  lootRevealSeed,
  latestReward,
  isLootRevealed,
  setIsLootRevealed,
  sessions,
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeSession) {
      return undefined;
    }

    setNow(Date.now());
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSession]);

  const focusMinutes = Number(activeSession?.focus_duration || sessionForm.focus_duration || 50);
  const defaultDurationMs = focusMinutes * 60 * 1000;
  const startedAtMs = activeSession ? new Date(activeSession.started_at).getTime() : 0;

  const remainingMs = useMemo(() => {
    if (!activeSession) {
      return defaultDurationMs;
    }
    if (Number.isNaN(startedAtMs)) {
      return 0;
    }
    return Math.max(0, startedAtMs + defaultDurationMs - now);
  }, [activeSession, defaultDurationMs, startedAtMs, now]);

  return (
    <SectionShell
      title="Chế độ làm việc sâu"
      subtitle="Bắt đầu phiên làm việc, ghi nhận các chu kỳ tập trung và nhận phần thưởng học tập."
      className="pomodoro-page"
    >
      <div className="pomodoro-spotlight">
        <p className="pomodoro-spotlight__label">{activeSession ? "Đang chạy phiên tập trung" : "Sẵn sàng bắt đầu phiên mới"}</p>
        <CountdownDisplay
          remainingMs={remainingMs}
          totalDurationMs={defaultDurationMs}
          mode={focusClockStyle}
          className="pomodoro-spotlight__clock"
        />
        <p className="pomodoro-spotlight__meta">
          {activeSession
            ? `Bắt đầu lúc ${formatDate(activeSession.started_at)} · Pomodoro đã ghi: ${activeSession.pomodoros_completed}`
            : `Thời lượng mặc định ${focusMinutes} phút`}
        </p>
      </div>

      <div className={activeSession ? "split-grid pomodoro-grid is-running" : "split-grid pomodoro-grid"}>
        <form className="panel panel--soft form-stack pomodoro-form" onSubmit={startSession}>
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
          <div className="focus-config">
            <h4>Tùy biến màn tập trung</h4>
            <label>
              Kiểu đồng hồ đếm ngược
              <select value={focusClockStyle} onChange={(event) => setFocusClockStyle(event.target.value)}>
                {CLOCK_STYLE_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">{CLOCK_STYLE_OPTIONS.find((item) => item.id === focusClockStyle)?.description}</p>

            <label>
              Nhạc nền
              <select value={focusMusicTrack} onChange={(event) => setFocusMusicTrack(event.target.value)}>
                {AMBIENT_TRACK_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-switch">
              <input
                type="checkbox"
                checked={focusMusicEnabled}
                onChange={(event) => setFocusMusicEnabled(event.target.checked)}
              />
              <span>Bật nhạc nền khi vào full-screen</span>
            </label>

            <label>
              Âm lượng: {Math.round(focusMusicVolume * 100)}%
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(focusMusicVolume * 100)}
                onChange={(event) => setFocusMusicVolume(Number(event.target.value) / 100)}
              />
            </label>
          </div>
          <button type="submit" className="button button--primary" disabled={!selectedSkillId || Boolean(activeSession)}>
            {activeSession ? "Đang trong phiên học" : "Bắt đầu phiên học"}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={enterFocusMode}
            disabled={!activeSession}
          >
            Vào full-screen tập trung
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

        <div className="stacked-panels pomodoro-side">
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

      <article className="panel panel--soft panel--history">
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
