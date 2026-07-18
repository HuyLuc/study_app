import { formatDate } from "../utils/formatDate";

function FocusOverlay({ isOpen, activeSession, selectedSkill, onLogFocusCycle, onEndSession, onClose }) {
  if (!isOpen || !activeSession) {
    return null;
  }

  return (
    <section className="focus-overlay" aria-label="Deep work overlay">
      <div className="focus-overlay__card">
        <p className="eyebrow">Tập Trung Sâu</p>
        <h2>{selectedSkill?.name || "Phiên tập trung"}</h2>
        <p className="focus-overlay__meta">
          Bắt đầu lúc {formatDate(activeSession.started_at)} · Số Pomodoro: {activeSession.pomodoros_completed}
        </p>
        <div className="focus-overlay__actions">
          <button type="button" className="button" onClick={onLogFocusCycle}>
            Ghi nhận 25 phút tập trung
          </button>
          <button type="button" className="button button--primary" onClick={onEndSession}>
            Hoàn thành phiên
          </button>
        </div>
        <button type="button" className="button button--ghost" onClick={onClose}>
          Thoát chế độ tập trung
        </button>
      </div>
    </section>
  );
}

export default FocusOverlay;
