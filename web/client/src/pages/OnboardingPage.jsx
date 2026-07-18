import SectionShell from "../components/SectionShell";

function OnboardingPage({
  skillForm,
  setSkillForm,
  createSkill,
  subSkillForm,
  setSubSkillForm,
  createSubSkill,
  latestSubSkill,
  taskForm,
  setTaskForm,
  createTask,
  latestTask,
  commitmentForm,
  setCommitmentForm,
  createCommitment,
  commitment,
}) {
  return (
    <SectionShell title="Phân rã kỹ năng" subtitle="Tạo kỹ năng, chia nhỏ nó ra và thiết lập cam kết giờ học đầu tiên.">
      <div className="split-grid">
        <form className="panel panel--soft form-stack" onSubmit={createSkill}>
          <h3>Tạo kỹ năng</h3>
          <label>
            Tên kỹ năng
            <input
              value={skillForm.name}
              onChange={(event) => setSkillForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ví dụ: Thiết kế sản phẩm"
              required
            />
          </label>
          <label>
            Mô tả
            <textarea
              value={skillForm.description}
              onChange={(event) => setSkillForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Kết quả mục tiêu bạn mong muốn đạt được (1 câu)."
            />
          </label>
          <label>
            Số giờ mục tiêu
            <input
              type="number"
              min="1"
              value={skillForm.target_hours}
              onChange={(event) => setSkillForm((prev) => ({ ...prev, target_hours: Number(event.target.value) }))}
            />
          </label>
          <button type="submit" className="button button--primary">
            Tạo kỹ năng
          </button>
        </form>

        <div className="stacked-panels">
          <form className="panel panel--soft form-stack" onSubmit={createSubSkill}>
            <h3>Thêm kỹ năng phụ</h3>
            <label>
              Tên kỹ năng phụ
              <input
                value={subSkillForm.name}
                onChange={(event) => setSubSkillForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ví dụ: Hệ thống cấp bậc chữ (Typography)"
                required
              />
            </label>
            <label className="inline-switch">
              <input
                type="checkbox"
                checked={subSkillForm.is_core}
                onChange={(event) => setSubSkillForm((prev) => ({ ...prev, is_core: event.target.checked }))}
              />
              <span>Cốt lõi 20%</span>
            </label>
            <button type="submit" className="button">
              Thêm kỹ năng phụ
            </button>
            {latestSubSkill ? (
              <p className="muted">
                Mới nhất: {latestSubSkill.name} ({latestSubSkill.is_core ? "cốt lõi" : "bổ trợ"})
              </p>
            ) : null}
          </form>

          <form className="panel panel--soft form-stack" onSubmit={createTask}>
            <h3>Tạo vi nhiệm vụ</h3>
            <label>
              Tiêu đề
              <input
                value={taskForm.title}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Ví dụ: Phác thảo 1 wireframe trong 5 phút"
                required
              />
            </label>
            <label>
              Số phút ước tính
              <input
                type="number"
                min="1"
                max="180"
                value={taskForm.estimated_minutes}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, estimated_minutes: Number(event.target.value) }))}
              />
            </label>
            <button type="submit" className="button">
              Tạo nhiệm vụ
            </button>
            {latestTask ? <p className="muted">Nhiệm vụ mới nhất: {latestTask.title}</p> : null}
          </form>

          <form className="panel panel--soft form-stack" onSubmit={createCommitment}>
            <h3>Cam kết 5 giờ</h3>
            <label>
              Số giờ mục tiêu
              <input
                type="number"
                min="1"
                max="100"
                value={commitmentForm.target_hours}
                onChange={(event) =>
                  setCommitmentForm((prev) => ({ ...prev, target_hours: Number(event.target.value) }))
                }
              />
            </label>
            <button type="submit" className="button">
              Ký cam kết
            </button>
            {commitment ? (
              <p className="muted">
                Trạng thái: {commitment.status} · {commitment.hours_completed.toFixed(2)}h / {commitment.target_hours}h
              </p>
            ) : (
              <p className="muted">Chưa có cam kết hoạt động cho kỹ năng đã chọn.</p>
            )}
          </form>
        </div>
      </div>
    </SectionShell>
  );
}

export default OnboardingPage;
