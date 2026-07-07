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
    <SectionShell title="Skill decomposition" subtitle="Create a skill, break it down, and lock a first-hour commitment.">
      <div className="split-grid">
        <form className="panel panel--soft form-stack" onSubmit={createSkill}>
          <h3>Create skill</h3>
          <label>
            Name
            <input
              value={skillForm.name}
              onChange={(event) => setSkillForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Product Design"
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={skillForm.description}
              onChange={(event) => setSkillForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="The one sentence outcome you want."
            />
          </label>
          <label>
            Target hours
            <input
              type="number"
              min="1"
              value={skillForm.target_hours}
              onChange={(event) => setSkillForm((prev) => ({ ...prev, target_hours: Number(event.target.value) }))}
            />
          </label>
          <button type="submit" className="button button--primary">
            Create skill
          </button>
        </form>

        <div className="stacked-panels">
          <form className="panel panel--soft form-stack" onSubmit={createSubSkill}>
            <h3>Add sub-skill</h3>
            <label>
              Sub-skill
              <input
                value={subSkillForm.name}
                onChange={(event) => setSubSkillForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g. Typography hierarchy"
                required
              />
            </label>
            <label className="inline-switch">
              <input
                type="checkbox"
                checked={subSkillForm.is_core}
                onChange={(event) => setSubSkillForm((prev) => ({ ...prev, is_core: event.target.checked }))}
              />
              <span>Core 20%</span>
            </label>
            <button type="submit" className="button">
              Add sub-skill
            </button>
            {latestSubSkill ? (
              <p className="muted">
                Latest: {latestSubSkill.name} ({latestSubSkill.is_core ? "core" : "support"})
              </p>
            ) : null}
          </form>

          <form className="panel panel--soft form-stack" onSubmit={createTask}>
            <h3>Create micro task</h3>
            <label>
              Title
              <input
                value={taskForm.title}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="e.g. Draft one wireframe in 5 minutes"
                required
              />
            </label>
            <label>
              Estimated minutes
              <input
                type="number"
                min="1"
                max="180"
                value={taskForm.estimated_minutes}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, estimated_minutes: Number(event.target.value) }))}
              />
            </label>
            <button type="submit" className="button">
              Create task
            </button>
            {latestTask ? <p className="muted">Latest task: {latestTask.title}</p> : null}
          </form>

          <form className="panel panel--soft form-stack" onSubmit={createCommitment}>
            <h3>5-hour commitment</h3>
            <label>
              Target hours
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
              Sign commitment
            </button>
            {commitment ? (
              <p className="muted">
                Status: {commitment.status} · {commitment.hours_completed.toFixed(2)}h / {commitment.target_hours}h
              </p>
            ) : (
              <p className="muted">No active commitment for selected skill.</p>
            )}
          </form>
        </div>
      </div>
    </SectionShell>
  );
}

export default OnboardingPage;
