import EmptyState from "../components/EmptyState";
import SectionShell from "../components/SectionShell";
import { formatDate } from "../utils/formatDate";

function JournalPage({ selectedSkillId, journalForm, setJournalForm, createJournalEntry, journalEntries }) {
  const todayLabel = formatDate(new Date().toISOString());

  return (
    <SectionShell
      title="Nhật ký lỗi sai"
      subtitle="Ghi lại các sai sót và bài học kinh nghiệm rút ra sau mỗi phiên học."
      className="journal-page"
    >
      <div className="split-grid journal-layout">
        <form className="journal-sheet" onSubmit={createJournalEntry}>
          <p className="journal-sheet__date">{todayLabel}</p>
          <input
            className="journal-input journal-input--title"
            value={journalForm.title}
            onChange={(event) => setJournalForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Tiêu đề lỗi sai hôm nay..."
            required
          />
          <textarea
            className="journal-input journal-input--body"
            value={journalForm.description}
            onChange={(event) => setJournalForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Mô tả bối cảnh, nguyên nhân và cách bạn đã xử lý..."
          />
          <textarea
            className="journal-input journal-input--body"
            value={journalForm.lesson_learned}
            onChange={(event) => setJournalForm((prev) => ({ ...prev, lesson_learned: event.target.value }))}
            placeholder="Bài học rút ra để không lặp lại lỗi này..."
          />
          <div className="journal-sheet__actions">
            <button type="submit" className="button button--primary" disabled={!selectedSkillId}>
              Lưu ghi chép
            </button>
          </div>
        </form>

        <article className="panel panel--soft">
          <h3>Lịch sử nhật ký</h3>
          {journalEntries.length === 0 ? (
            <EmptyState title="Chưa có ghi chép nào" description="Hãy viết một bài học kinh nghiệm rút ra sau mỗi phiên học." />
          ) : (
            <ul className="list">
              {journalEntries.slice(0, 12).map((entry) => (
                <li key={entry.id} className="list__item list__item--text">
                  <p>
                    <strong>{entry.title}</strong>
                  </p>
                  <p>{entry.description || "Không có mô tả chi tiết."}</p>
                  <p className="muted">Bài học: {entry.lesson_learned || "Chưa có bài học cụ thể."}</p>
                  <p className="muted">{formatDate(entry.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </SectionShell>
  );
}

export default JournalPage;
