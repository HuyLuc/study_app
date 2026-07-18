import EmptyState from "../components/EmptyState";
import SectionShell from "../components/SectionShell";
import { formatDate } from "../utils/formatDate";

function JournalPage({ selectedSkillId, journalForm, setJournalForm, createJournalEntry, journalEntries }) {
  return (
    <SectionShell title="Nhật ký lỗi sai" subtitle="Ghi lại các sai sót và bài học kinh nghiệm rút ra sau mỗi phiên học.">
      <div className="split-grid">
        <form className="panel panel--soft form-stack" onSubmit={createJournalEntry}>
          <h3>Ghi chép mới</h3>
          <label>
            Tiêu đề
            <input
              value={journalForm.title}
              onChange={(event) => setJournalForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Có lỗi gì đã xảy ra?"
              required
            />
          </label>
          <label>
            Chi tiết lỗi sai
            <textarea
              value={journalForm.description}
              onChange={(event) => setJournalForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Mô tả bối cảnh và nguyên nhân lỗi sai..."
            />
          </label>
          <label>
            Bài học rút ra
            <textarea
              value={journalForm.lesson_learned}
              onChange={(event) => setJournalForm((prev) => ({ ...prev, lesson_learned: event.target.value }))}
              placeholder="Bạn sẽ làm thế nào để tránh lỗi này lần sau?"
            />
          </label>
          <button type="submit" className="button button--primary" disabled={!selectedSkillId}>
            Lưu ghi chép
          </button>
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
