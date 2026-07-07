import EmptyState from "../components/EmptyState";
import MetricCard from "../components/MetricCard";
import SectionShell from "../components/SectionShell";

function FlashcardsPage({
  selectedSkillId,
  selectedSkill,
  flashcardForm,
  setFlashcardForm,
  createFlashcard,
  flashcardsDue,
  revealedFlashcards,
  toggleFlashcardReveal,
  reviewCard,
  flashcardStats,
}) {
  return (
    <SectionShell title="Flashcard review" subtitle="Create cards and run spaced repetition reviews directly after your sessions.">
      <div className="split-grid">
        <form className="panel panel--soft form-stack" onSubmit={createFlashcard}>
          <h3>Create flashcard</h3>
          <label>
            Front
            <textarea
              value={flashcardForm.front}
              onChange={(event) => setFlashcardForm((prev) => ({ ...prev, front: event.target.value }))}
              placeholder="Prompt"
              required
            />
          </label>
          <label>
            Back
            <textarea
              value={flashcardForm.back}
              onChange={(event) => setFlashcardForm((prev) => ({ ...prev, back: event.target.value }))}
              placeholder="Answer"
              required
            />
          </label>
          <button type="submit" className="button button--primary" disabled={!selectedSkillId}>
            Add flashcard
          </button>
          <p className="muted">Current skill: {selectedSkill?.name || "none"}</p>
        </form>

        <article className="panel panel--soft">
          <h3>Review queue</h3>
          {flashcardsDue.length === 0 ? (
            <EmptyState title="No due cards" description="Create cards or wait until next scheduled review." />
          ) : (
            <ul className="list list--cards">
              {flashcardsDue.slice(0, 12).map((card) => (
                <li key={card.id} className="card-review">
                  <button
                    type="button"
                    className={revealedFlashcards[card.id] ? "flashcard-flip is-revealed" : "flashcard-flip"}
                    onClick={() => toggleFlashcardReveal(card.id)}
                  >
                    <span className="flashcard-flip__face flashcard-flip__face--front">{card.front}</span>
                    <span className="flashcard-flip__face flashcard-flip__face--back">{card.back}</span>
                  </button>
                  {revealedFlashcards[card.id] ? (
                    <div className="difficulty-row">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button key={value} type="button" className="chip" onClick={() => reviewCard(card.id, value)}>
                          {value}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Tap card to reveal answer.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="panel panel--soft">
        <h3>Flashcard stats</h3>
        {flashcardStats ? (
          <div className="metrics-grid">
            <MetricCard label="Total cards" value={flashcardStats.total_cards} />
            <MetricCard label="Due today" value={flashcardStats.due_today} />
            <MetricCard label="Total reviews" value={flashcardStats.total_reviews} />
            <MetricCard label="Reviews today" value={flashcardStats.reviews_today} />
          </div>
        ) : (
          <EmptyState title="No stats yet" description="Stats appear after your first card." />
        )}
      </article>
    </SectionShell>
  );
}

export default FlashcardsPage;
