import EmptyState from "../components/EmptyState";
import SectionShell from "../components/SectionShell";
import { formatDate } from "../utils/formatDate";

function JournalPage({ selectedSkillId, journalForm, setJournalForm, createJournalEntry, journalEntries }) {
  return (
    <SectionShell title="Error journal" subtitle="Capture mistakes and lessons after each study session.">
      <div className="split-grid">
        <form className="panel panel--soft form-stack" onSubmit={createJournalEntry}>
          <h3>New entry</h3>
          <label>
            Title
            <input
              value={journalForm.title}
              onChange={(event) => setJournalForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="What went wrong?"
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={journalForm.description}
              onChange={(event) => setJournalForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Context of the mistake"
            />
          </label>
          <label>
            Lesson learned
            <textarea
              value={journalForm.lesson_learned}
              onChange={(event) => setJournalForm((prev) => ({ ...prev, lesson_learned: event.target.value }))}
              placeholder="How will you avoid this next time?"
            />
          </label>
          <button type="submit" className="button button--primary" disabled={!selectedSkillId}>
            Save entry
          </button>
        </form>

        <article className="panel panel--soft">
          <h3>Journal history</h3>
          {journalEntries.length === 0 ? (
            <EmptyState title="No entries yet" description="Write one insight after each session." />
          ) : (
            <ul className="list">
              {journalEntries.slice(0, 12).map((entry) => (
                <li key={entry.id} className="list__item list__item--text">
                  <p>
                    <strong>{entry.title}</strong>
                  </p>
                  <p>{entry.description || "No description."}</p>
                  <p className="muted">Lesson: {entry.lesson_learned || "No lesson yet."}</p>
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
