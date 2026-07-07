import { formatDate } from "../utils/formatDate";

function FocusOverlay({ isOpen, activeSession, selectedSkill, onLogFocusCycle, onEndSession, onClose }) {
  if (!isOpen || !activeSession) {
    return null;
  }

  return (
    <section className="focus-overlay" aria-label="Deep work overlay">
      <div className="focus-overlay__card">
        <p className="eyebrow">Deep Work</p>
        <h2>{selectedSkill?.name || "Focus session"}</h2>
        <p className="focus-overlay__meta">
          Started {formatDate(activeSession.started_at)} · Pomodoros {activeSession.pomodoros_completed}
        </p>
        <div className="focus-overlay__actions">
          <button type="button" className="button" onClick={onLogFocusCycle}>
            Log focus cycle
          </button>
          <button type="button" className="button button--primary" onClick={onEndSession}>
            End session
          </button>
        </div>
        <button type="button" className="button button--ghost" onClick={onClose}>
          Exit focus view
        </button>
      </div>
    </section>
  );
}

export default FocusOverlay;
