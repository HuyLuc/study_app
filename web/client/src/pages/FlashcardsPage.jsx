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
    <SectionShell
      title="Ôn tập Flashcard"
      subtitle="Tạo các thẻ ghi nhớ và ôn tập lặp lại ngắt quãng ngay sau mỗi phiên học."
      className="flashcards-page"
    >
      <div className="split-grid">
        <form className="panel panel--soft form-stack" onSubmit={createFlashcard}>
          <h3>Tạo thẻ ghi nhớ</h3>
          <label>
            Mặt trước
            <textarea
              value={flashcardForm.front}
              onChange={(event) => setFlashcardForm((prev) => ({ ...prev, front: event.target.value }))}
              placeholder="Câu hỏi / Gợi ý"
              required
            />
          </label>
          <label>
            Mặt sau
            <textarea
              value={flashcardForm.back}
              onChange={(event) => setFlashcardForm((prev) => ({ ...prev, back: event.target.value }))}
              placeholder="Câu trả lời / Giải thích"
              required
            />
          </label>
          <button type="submit" className="button button--primary" disabled={!selectedSkillId}>
            Thêm thẻ
          </button>
          <p className="muted">Kỹ năng hiện tại: {selectedSkill?.name || "chưa chọn"}</p>
        </form>

        <article className="panel panel--plain flashcards-deck">
          <h3>Hàng đợi ôn tập</h3>
          {flashcardsDue.length === 0 ? (
            <EmptyState title="Không có thẻ cần ôn tập" description="Tạo thêm thẻ mới hoặc đợi đến lịch ôn tập tiếp theo." />
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
                    <p className="muted">Nhấp vào thẻ để xem đáp án.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="panel panel--plain">
        <h3>Thống kê Flashcard</h3>
        {flashcardStats ? (
          <div className="metrics-grid">
            <MetricCard label="Tổng số thẻ" value={flashcardStats.total_cards} />
            <MetricCard label="Cần ôn hôm nay" value={flashcardStats.due_today} />
            <MetricCard label="Tổng lượt ôn" value={flashcardStats.total_reviews} />
            <MetricCard label="Đã ôn hôm nay" value={flashcardStats.reviews_today} />
          </div>
        ) : (
          <EmptyState title="Chưa có thống kê" description="Thống kê sẽ hiển thị sau khi bạn tạo thẻ đầu tiên." />
        )}
      </article>
    </SectionShell>
  );
}

export default FlashcardsPage;
