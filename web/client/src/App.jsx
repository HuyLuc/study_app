import { useEffect, useMemo, useState } from "react";

import { authApi, gamificationApi, learningApi, notificationApi } from "./api/services";
import { ApiError, apiClient } from "./api/client";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "onboarding", label: "Skill Setup" },
  { id: "pomodoro", label: "Pomodoro" },
  { id: "flashcards", label: "Flashcards" },
  { id: "journal", label: "Journal" },
  { id: "profile", label: "Profile" },
];

const defaultSkillForm = { name: "", description: "", target_hours: 20 };
const defaultAuthForm = { email: "", password: "", display_name: "" };
const defaultSubSkillForm = { name: "", is_core: true, order_index: 0 };
const defaultTaskForm = { title: "", estimated_minutes: 5 };
const defaultCommitmentForm = { target_hours: 5 };
const defaultSessionForm = { focus_duration: 50, break_duration: 10 };
const defaultFlashcardForm = { front: "", back: "" };
const defaultJournalForm = { title: "", description: "", lesson_learned: "" };

function SectionShell({ title, subtitle, children }) {
  return (
    <section className="panel panel--spacious fade-up">
      <header className="panel__header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="metric-card">
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
      {detail ? <p className="metric-card__detail">{detail}</p> : null}
    </article>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__description">{description}</p> : null}
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function App() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [busyLabel, setBusyLabel] = useState("");
  const [notice, setNotice] = useState({ tone: "", text: "" });

  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [user, setUser] = useState(null);

  const [activeView, setActiveView] = useState("dashboard");

  const [skills, setSkills] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");

  const [skillForm, setSkillForm] = useState(defaultSkillForm);
  const [subSkillForm, setSubSkillForm] = useState(defaultSubSkillForm);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [commitmentForm, setCommitmentForm] = useState(defaultCommitmentForm);
  const [sessionForm, setSessionForm] = useState(defaultSessionForm);
  const [flashcardForm, setFlashcardForm] = useState(defaultFlashcardForm);
  const [journalForm, setJournalForm] = useState(defaultJournalForm);

  const [latestSubSkill, setLatestSubSkill] = useState(null);
  const [latestTask, setLatestTask] = useState(null);
  const [commitment, setCommitment] = useState(null);

  const [activeSession, setActiveSession] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [sessions, setSessions] = useState([]);

  const [flashcardsDue, setFlashcardsDue] = useState([]);
  const [flashcardStats, setFlashcardStats] = useState(null);
  const [journalEntries, setJournalEntries] = useState([]);

  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [badges, setBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [rewardsHistory, setRewardsHistory] = useState([]);
  const [rewardsPool, setRewardsPool] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [focusOverlayOpen, setFocusOverlayOpen] = useState(false);
  const [revealedFlashcards, setRevealedFlashcards] = useState({});
  const [lootRevealSeed, setLootRevealSeed] = useState(0);
  const [isLootRevealed, setIsLootRevealed] = useState(false);

  const selectedSkill = useMemo(
    () => skills.find((item) => item.id === selectedSkillId) || null,
    [skills, selectedSkillId],
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.is_read),
    [notifications],
  );

  const inAppPreferences = useMemo(
    () => preferences.filter((item) => item.channel === "in_app"),
    [preferences],
  );

  const latestReward = useMemo(
    () => rewardsHistory[0] || null,
    [rewardsHistory],
  );

  function showNotice(text, tone = "neutral") {
    setNotice({ tone, text });
    window.clearTimeout(showNotice._timer);
    showNotice._timer = window.setTimeout(() => {
      setNotice({ tone: "", text: "" });
    }, 3200);
  }

  async function runBusy(label, action) {
    setBusyLabel(label);
    try {
      await action();
    } catch (error) {
      showNotice(error?.message || "Something went wrong.", "danger");
    } finally {
      setBusyLabel("");
    }
  }

  async function loadSkillScopedData(skillId) {
    if (!skillId || !user) {
      setCommitment(null);
      setFlashcardsDue([]);
      setFlashcardStats(null);
      setJournalEntries([]);
      return;
    }

    const query = `?skill_id=${skillId}`;

    try {
      const [cards, stats, journal, maybeCommitment] = await Promise.all([
        learningApi.listFlashcards(`${query}&due=today`),
        learningApi.flashcardStats(query),
        learningApi.listJournal(query),
        learningApi.getCommitment(skillId).catch((error) => {
          if (error instanceof ApiError && error.status === 404) {
            return null;
          }
          throw error;
        }),
      ]);

      setFlashcardsDue(cards || []);
      setFlashcardStats(stats || null);
      setJournalEntries(journal || []);
      setCommitment(maybeCommitment);
    } catch (error) {
      showNotice(error?.message || "Unable to load skill details.", "danger");
    }
  }

  async function loadGlobalData() {
    if (!user) {
      return;
    }

    const [
      skillsData,
      sessionsData,
      profileData,
      streakData,
      leaderboardData,
      badgesData,
      allBadgesData,
      rewardsData,
      rewardPoolData,
      notificationsData,
      preferencesData,
    ] = await Promise.all([
      learningApi.listSkills(),
      learningApi.listSessions(),
      gamificationApi.profile(),
      gamificationApi.streak(),
      gamificationApi.leaderboard(10),
      gamificationApi.badges(),
      gamificationApi.allBadges(),
      gamificationApi.rewardsHistory(),
      gamificationApi.rewardsPool(),
      notificationApi.list(),
      notificationApi.getPreferences(),
    ]);

    setSkills(skillsData || []);
    setSessions(sessionsData || []);
    setProfile(profileData || null);
    setStreak(streakData || null);
    setLeaderboard(leaderboardData || []);
    setBadges(badgesData || []);
    setAllBadges(allBadgesData || []);
    setRewardsHistory(rewardsData || []);
    setRewardsPool(rewardPoolData || []);
    setNotifications(notificationsData || []);
    setPreferences(preferencesData || []);

    const hasCurrentSkill = (skillsData || []).some((item) => item.id === selectedSkillId);
    if (!hasCurrentSkill) {
      setSelectedSkillId(skillsData?.[0]?.id || "");
    }
  }

  async function bootstrap() {
    if (!apiClient.getAccessToken()) {
      setIsBootstrapping(false);
      return;
    }

    try {
      const me = await authApi.me();
      setUser(me);
      await loadGlobalData();
    } catch {
      await authApi.logout();
      setUser(null);
    } finally {
      setIsBootstrapping(false);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (selectedSkillId && user) {
      loadSkillScopedData(selectedSkillId);
    }
  }, [selectedSkillId, user]);

  useEffect(() => {
    if (!activeSession) {
      setFocusOverlayOpen(false);
    }
  }, [activeSession]);

  async function onAuthSubmit(event) {
    event.preventDefault();

    if (!authForm.email || !authForm.password) {
      showNotice("Email and password are required.", "danger");
      return;
    }

    await runBusy(authMode === "login" ? "Signing in..." : "Creating account...", async () => {
      if (authMode === "register") {
        await authApi.register({
          email: authForm.email,
          password: authForm.password,
          display_name: authForm.display_name || null,
        });
      }

      await authApi.login({
        email: authForm.email,
        password: authForm.password,
      });

      const me = await authApi.me();
      setUser(me);
      await loadGlobalData();
      setActiveView("dashboard");
      showNotice("Welcome back. Workspace is ready.", "success");
    });
  }

  async function onLogout() {
    await runBusy("Signing out...", async () => {
      await authApi.logout();
      setUser(null);
      setSkills([]);
      setSelectedSkillId("");
      setCommitment(null);
      setNotifications([]);
      setPreferences([]);
      setProfile(null);
      setStreak(null);
      setLeaderboard([]);
      setBadges([]);
      setAllBadges([]);
      setRewardsHistory([]);
      setRewardsPool([]);
      setFlashcardsDue([]);
      setFlashcardStats(null);
      setRevealedFlashcards({});
      setFocusOverlayOpen(false);
      setLootRevealSeed(0);
      setIsLootRevealed(false);
      setJournalEntries([]);
      setSessions([]);
      setActiveSession(null);
      setSessionSummary(null);
      showNotice("Signed out.", "neutral");
    });
  }

  async function createSkill(event) {
    event.preventDefault();
    if (!skillForm.name.trim()) {
      showNotice("Skill name is required.", "danger");
      return;
    }

    await runBusy("Creating skill...", async () => {
      const created = await learningApi.createSkill({
        name: skillForm.name.trim(),
        description: skillForm.description.trim() || null,
        target_hours: Number(skillForm.target_hours || 20),
      });
      setSkillForm(defaultSkillForm);
      await loadGlobalData();
      setSelectedSkillId(created.id);
      showNotice("Skill created.", "success");
    });
  }

  async function createSubSkill(event) {
    event.preventDefault();
    if (!selectedSkillId) {
      showNotice("Select a skill first.", "danger");
      return;
    }
    if (!subSkillForm.name.trim()) {
      showNotice("Sub-skill name is required.", "danger");
      return;
    }

    await runBusy("Adding sub-skill...", async () => {
      const created = await learningApi.createSubSkill(selectedSkillId, {
        name: subSkillForm.name.trim(),
        is_core: subSkillForm.is_core,
        order_index: Number(subSkillForm.order_index || 0),
      });
      setLatestSubSkill(created);
      setSubSkillForm(defaultSubSkillForm);
      showNotice("Sub-skill added.", "success");
    });
  }

  async function createTask(event) {
    event.preventDefault();
    if (!selectedSkillId) {
      showNotice("Select a skill first.", "danger");
      return;
    }
    if (!latestSubSkill?.id) {
      showNotice("Create at least one sub-skill first.", "danger");
      return;
    }
    if (!taskForm.title.trim()) {
      showNotice("Task title is required.", "danger");
      return;
    }

    await runBusy("Adding task...", async () => {
      const created = await learningApi.createTask(selectedSkillId, {
        sub_skill_id: latestSubSkill.id,
        title: taskForm.title.trim(),
        estimated_minutes: Number(taskForm.estimated_minutes || 5),
      });
      setLatestTask(created);
      setTaskForm(defaultTaskForm);
      showNotice("Task created.", "success");
    });
  }

  async function createCommitment(event) {
    event.preventDefault();
    if (!selectedSkillId) {
      showNotice("Select a skill first.", "danger");
      return;
    }

    await runBusy("Signing commitment...", async () => {
      const created = await learningApi.createCommitment(selectedSkillId, {
        target_hours: Number(commitmentForm.target_hours || 5),
      });
      setCommitment(created);
      showNotice("Commitment signed.", "success");
    });
  }

  async function startSession(event) {
    event.preventDefault();
    if (!selectedSkillId) {
      showNotice("Select a skill first.", "danger");
      return;
    }

    await runBusy("Starting session...", async () => {
      const session = await learningApi.startSession({
        skill_id: selectedSkillId,
        focus_duration: Number(sessionForm.focus_duration || 50),
        break_duration: Number(sessionForm.break_duration || 10),
      });
      setActiveSession(session);
      setSessionSummary(null);
      showNotice("Session started.", "success");
    });
  }

  async function logFocusCycle() {
    if (!activeSession) {
      return;
    }

    await runBusy("Logging focus cycle...", async () => {
      const endedAt = new Date();
      const startedAt = new Date(endedAt.getTime() - Number(activeSession.focus_duration || 50) * 60000);

      const updated = await learningApi.logPomodoro(activeSession.id, {
        type: "focus",
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        completed: true,
      });
      setActiveSession(updated);
      showNotice("Focus cycle logged.", "success");
    });
  }

  async function endSession() {
    if (!activeSession) {
      return;
    }

    await runBusy("Ending session...", async () => {
      const ended = await learningApi.endSession(activeSession.id, {
        ended_at: new Date().toISOString(),
      });
      setSessionSummary(ended);
      setActiveSession(null);
      setFocusOverlayOpen(false);
      setLootRevealSeed((prev) => prev + 1);
      setIsLootRevealed(false);
      await loadGlobalData();
      await loadSkillScopedData(selectedSkillId);
      showNotice("Session completed.", "success");
    });
  }

  async function createFlashcard(event) {
    event.preventDefault();
    if (!selectedSkillId) {
      showNotice("Select a skill first.", "danger");
      return;
    }
    if (!flashcardForm.front.trim() || !flashcardForm.back.trim()) {
      showNotice("Both flashcard sides are required.", "danger");
      return;
    }

    await runBusy("Creating flashcard...", async () => {
      await learningApi.createFlashcard({
        skill_id: selectedSkillId,
        front: flashcardForm.front.trim(),
        back: flashcardForm.back.trim(),
      });
      setFlashcardForm(defaultFlashcardForm);
      await loadSkillScopedData(selectedSkillId);
      showNotice("Flashcard added.", "success");
    });
  }

  async function reviewCard(cardId, difficulty) {
    await runBusy("Submitting review...", async () => {
      setRevealedFlashcards((prev) => {
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      await learningApi.reviewFlashcard(cardId, { difficulty });
      await loadSkillScopedData(selectedSkillId);
      await loadGlobalData();
      showNotice(`Review saved (difficulty ${difficulty}).`, "success");
    });
  }

  function toggleFlashcardReveal(cardId) {
    setRevealedFlashcards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  }

  async function createJournalEntry(event) {
    event.preventDefault();
    if (!selectedSkillId) {
      showNotice("Select a skill first.", "danger");
      return;
    }
    if (!journalForm.title.trim()) {
      showNotice("Entry title is required.", "danger");
      return;
    }

    await runBusy("Saving journal entry...", async () => {
      await learningApi.createJournalEntry({
        skill_id: selectedSkillId,
        title: journalForm.title.trim(),
        description: journalForm.description.trim() || null,
        lesson_learned: journalForm.lesson_learned.trim() || null,
      });
      setJournalForm(defaultJournalForm);
      await loadSkillScopedData(selectedSkillId);
      showNotice("Journal entry saved.", "success");
    });
  }

  async function markNotificationRead(notificationId) {
    await runBusy("Updating notification...", async () => {
      await notificationApi.readOne(notificationId);
      const data = await notificationApi.list();
      setNotifications(data || []);
      showNotice("Notification marked as read.", "success");
    });
  }

  async function markAllNotificationsRead() {
    await runBusy("Marking all read...", async () => {
      await notificationApi.readAll();
      const data = await notificationApi.list();
      setNotifications(data || []);
      showNotice("All notifications marked as read.", "success");
    });
  }

  async function togglePreference(item) {
    await runBusy("Saving preference...", async () => {
      const next = await notificationApi.updatePreferences([
        {
          channel: item.channel,
          type: item.type,
          enabled: !item.enabled,
        },
      ]);
      setPreferences(next || []);
      showNotice("Preference updated.", "success");
    });
  }

  async function buyFreeze() {
    await runBusy("Buying streak freeze...", async () => {
      await gamificationApi.buyFreeze();
      const [profileData, streakData] = await Promise.all([gamificationApi.profile(), gamificationApi.streak()]);
      setProfile(profileData);
      setStreak(streakData);
      showNotice("Streak freeze purchased.", "success");
    });
  }

  function renderDashboard() {
    return (
      <SectionShell title="Learning cockpit" subtitle="One place for streak, XP, skill progress, and notifications.">
        <div className="metrics-grid">
          <MetricCard
            label="Current XP"
            value={profile ? profile.total_xp : "-"}
            detail={profile ? `Level ${profile.level} · ${profile.title}` : "Gamification profile unavailable."}
          />
          <MetricCard
            label="Current Streak"
            value={streak ? `${streak.current_streak} days` : "-"}
            detail={streak ? `Longest ${streak.longest_streak} · Freeze ${streak.freeze_count}` : "Streak engine idle."}
          />
          <MetricCard
            label="Active Skills"
            value={skills.length}
            detail={selectedSkill ? `Selected: ${selectedSkill.name}` : "Create your first skill to begin."}
          />
          <MetricCard
            label="Unread"
            value={unreadNotifications.length}
            detail="In-app notifications from events and streak monitor."
          />
        </div>

        <div className="split-grid">
          <article className="panel panel--soft">
            <header className="mini-header">
              <h3>Skills</h3>
              <button type="button" className="chip" onClick={() => setActiveView("onboarding")}>
                Open setup
              </button>
            </header>
            {skills.length === 0 ? (
              <EmptyState title="No skills yet" description="Create your first skill in Skill Setup." />
            ) : (
              <ul className="list">
                {skills.map((skill) => (
                  <li key={skill.id} className={skill.id === selectedSkillId ? "list__item is-active" : "list__item"}>
                    <button type="button" onClick={() => setSelectedSkillId(skill.id)}>
                      <span>{skill.name}</span>
                      <span className="muted">{skill.total_hours_logged.toFixed(1)}h / {skill.target_hours}h</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel panel--soft">
            <header className="mini-header">
              <h3>Notifications</h3>
              <button type="button" className="chip" onClick={markAllNotificationsRead}>
                Mark all read
              </button>
            </header>
            {notifications.length === 0 ? (
              <EmptyState title="No notifications" description="Complete sessions to trigger gamification events." />
            ) : (
              <ul className="list">
                {notifications.slice(0, 6).map((item) => (
                  <li key={item.id} className={item.is_read ? "list__item" : "list__item is-unread"}>
                    <button type="button" onClick={() => markNotificationRead(item.id)}>
                      <span>{item.title}</span>
                      <span className="muted">{formatDate(item.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderOnboarding() {
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
            <button type="submit" className="button button--primary">Create skill</button>
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
              <button type="submit" className="button">Add sub-skill</button>
              {latestSubSkill ? (
                <p className="muted">Latest: {latestSubSkill.name} ({latestSubSkill.is_core ? "core" : "support"})</p>
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
              <button type="submit" className="button">Create task</button>
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
                  onChange={(event) => setCommitmentForm((prev) => ({ ...prev, target_hours: Number(event.target.value) }))}
                />
              </label>
              <button type="submit" className="button">Sign commitment</button>
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

  function renderPomodoro() {
    return (
      <SectionShell title="Deep work mode" subtitle="Start session, log focus blocks, and end to trigger reward and streak updates.">
        <div className="split-grid">
          <form className="panel panel--soft form-stack" onSubmit={startSession}>
            <h3>Start session</h3>
            <label>
              Skill
              <select value={selectedSkillId} onChange={(event) => setSelectedSkillId(event.target.value)} required>
                <option value="">Select skill</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>{skill.name}</option>
                ))}
              </select>
            </label>
            <label>
              Focus duration (minutes)
              <input
                type="number"
                min="1"
                max="240"
                value={sessionForm.focus_duration}
                onChange={(event) => setSessionForm((prev) => ({ ...prev, focus_duration: Number(event.target.value) }))}
              />
            </label>
            <label>
              Break duration (minutes)
              <input
                type="number"
                min="1"
                max="120"
                value={sessionForm.break_duration}
                onChange={(event) => setSessionForm((prev) => ({ ...prev, break_duration: Number(event.target.value) }))}
              />
            </label>
            <button type="submit" className="button button--primary" disabled={!selectedSkillId || Boolean(activeSession)}>
              {activeSession ? "Session active" : "Start session"}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setFocusOverlayOpen(true)}
              disabled={!activeSession}
            >
              Enter focus view
            </button>
            {activeSession ? (
              <div className="action-row">
                <button type="button" className="button" onClick={logFocusCycle}>Log focus cycle</button>
                <button type="button" className="button button--primary" onClick={endSession}>End session</button>
              </div>
            ) : null}
          </form>

          <div className="stacked-panels">
            <article className="panel panel--soft">
              <h3>Live session</h3>
              {activeSession ? (
                <div className="session-live">
                  <p><strong>Started:</strong> {formatDate(activeSession.started_at)}</p>
                  <p><strong>Pomodoros:</strong> {activeSession.pomodoros_completed}</p>
                  <p><strong>Focus minutes:</strong> {activeSession.total_focus_minutes.toFixed(1)}</p>
                </div>
              ) : (
                <EmptyState title="No active session" description="Start one to enter deep work mode." />
              )}
            </article>

            <article className="panel panel--soft">
              <h3>Last summary</h3>
              {sessionSummary ? (
                <div className="session-live">
                  <p><strong>Focus minutes:</strong> {sessionSummary.total_focus_minutes.toFixed(1)}</p>
                  <p><strong>Pomodoros:</strong> {sessionSummary.pomodoros_completed}</p>
                  <p><strong>Status:</strong> {sessionSummary.status}</p>
                  <div key={`${lootRevealSeed}-${latestReward?.id || "none"}`} className={isLootRevealed ? "loot-card is-open" : "loot-card"}>
                    <p className="loot-card__label">Loot capsule</p>
                    <button type="button" className="loot-card__button" onClick={() => setIsLootRevealed((prev) => !prev)}>
                      {isLootRevealed
                        ? latestReward
                          ? `${latestReward.reward_name} · ${latestReward.rarity}`
                          : "No reward this session"
                        : "Tap to reveal"}
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState title="No completed session in this view" description="End a session to see summary and reward." />
              )}
            </article>
          </div>
        </div>

        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>Session history</h3>
          </header>
          {sessions.length === 0 ? (
            <EmptyState title="No sessions yet" description="Start your first focused session." />
          ) : (
            <ul className="list">
              {sessions.slice(0, 8).map((item) => (
                <li key={item.id} className="list__item">
                  <button type="button">
                    <span>{formatDate(item.started_at)}</span>
                    <span className="muted">{item.total_focus_minutes.toFixed(1)} min · {item.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </SectionShell>
    );
  }

  function renderFlashcards() {
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

  function renderJournal() {
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
                    <p><strong>{entry.title}</strong></p>
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

  function renderProfile() {
    return (
      <SectionShell title="Performance profile" subtitle="Track long-term momentum across levels, badges, rewards, and leaderboard.">
        <div className="metrics-grid">
          <MetricCard label="Level" value={profile ? profile.level : "-"} detail={profile?.title} />
          <MetricCard label="Total XP" value={profile ? profile.total_xp : "-"} detail={profile ? `${profile.xp_for_next_level} XP to next level` : "-"} />
          <MetricCard label="Longest streak" value={streak ? `${streak.longest_streak} days` : "-"} detail={streak ? `Current ${streak.current_streak}` : "-"} />
          <MetricCard label="Unlocked badges" value={badges.length} detail={`${allBadges.filter((item) => item.is_unlocked).length}/${allBadges.length}`} />
        </div>

        <div className="split-grid">
          <article className="panel panel--soft">
            <header className="mini-header">
              <h3>Leaderboard</h3>
            </header>
            {leaderboard.length === 0 ? (
              <EmptyState title="No leaderboard data" description="Complete sessions to build ranking." />
            ) : (
              <ul className="list">
                {leaderboard.map((item, index) => (
                  <li key={item.user_id} className="list__item">
                    <button type="button">
                      <span>#{index + 1} · {item.user_id.slice(0, 8)}</span>
                      <span className="muted">{item.total_xp} XP · L{item.level}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel panel--soft">
            <header className="mini-header">
              <h3>Reward history</h3>
            </header>
            {rewardsHistory.length === 0 ? (
              <EmptyState title="No rewards yet" description="Rewards appear after completed sessions." />
            ) : (
              <ul className="list">
                {rewardsHistory.slice(0, 8).map((item) => (
                  <li key={item.id} className="list__item">
                    <button type="button">
                      <span>{item.reward_name}</span>
                      <span className="muted">{item.rarity} · {formatDate(item.received_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <div className="split-grid">
          <article className="panel panel--soft">
            <header className="mini-header">
              <h3>Badges</h3>
            </header>
            {allBadges.length === 0 ? (
              <EmptyState title="No badges configured" />
            ) : (
              <ul className="list">
                {allBadges.map((item) => (
                  <li key={item.id} className={item.is_unlocked ? "list__item is-active" : "list__item"}>
                    <button type="button">
                      <span>{item.name}</span>
                      <span className="muted">{item.is_unlocked ? "Unlocked" : "Locked"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel panel--soft">
            <header className="mini-header">
              <h3>Reward pool + streak freeze</h3>
              <button type="button" className="chip" onClick={buyFreeze}>Buy freeze</button>
            </header>
            {rewardsPool.length === 0 ? (
              <EmptyState title="No rewards configured" />
            ) : (
              <ul className="list">
                {rewardsPool.map((item) => (
                  <li key={item.id} className="list__item">
                    <button type="button">
                      <span>{item.name}</span>
                      <span className="muted">{item.rarity} · weight {item.probability_weight}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <article className="panel panel--soft">
          <header className="mini-header">
            <h3>In-app notification preferences</h3>
          </header>
          {inAppPreferences.length === 0 ? (
            <EmptyState title="No preferences" />
          ) : (
            <div className="preferences-grid">
              {inAppPreferences.map((item) => (
                <button
                  key={`${item.channel}-${item.type}`}
                  type="button"
                  className={item.enabled ? "chip chip--on" : "chip"}
                  onClick={() => togglePreference(item)}
                >
                  {item.type.replaceAll("_", " ")}: {item.enabled ? "on" : "off"}
                </button>
              ))}
            </div>
          )}
        </article>
      </SectionShell>
    );
  }

  function renderMainContent() {
    if (activeView === "onboarding") {
      return renderOnboarding();
    }
    if (activeView === "pomodoro") {
      return renderPomodoro();
    }
    if (activeView === "flashcards") {
      return renderFlashcards();
    }
    if (activeView === "journal") {
      return renderJournal();
    }
    if (activeView === "profile") {
      return renderProfile();
    }
    return renderDashboard();
  }

  if (isBootstrapping) {
    return (
      <main className="loading-shell">
        <div className="loading-orb" />
        <p>Preparing workspace...</p>
      </main>
    );
  }

  return (
    <>
      <div className="background-layers" aria-hidden="true">
        <span className="halo halo--a" />
        <span className="halo halo--b" />
        <span className="halo halo--c" />
      </div>

      <header className="top-nav">
        <div className="top-nav__inner">
          <div>
            <p className="top-nav__brand">Optimal Learning</p>
            <p className="top-nav__sub">Sprint 6 front-end experience</p>
          </div>
          <div className="top-nav__actions">
            <a className="button-link" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
              API docs
            </a>
            {user ? (
              <button type="button" className="button" onClick={onLogout}>
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="app-shell">
        {notice.text ? (
          <div className={`notice notice--${notice.tone || "neutral"}`}>
            {notice.text}
          </div>
        ) : null}

        {busyLabel ? <div className="busy-chip">{busyLabel}</div> : null}

        {!user ? (
          <section className="auth-layout fade-up">
            <article className="hero-card">
              <p className="eyebrow">20-hour challenge</p>
              <h1>Build focus, then let momentum run itself.</h1>
              <p>
                This client connects to your FastAPI microservices for skills, Pomodoro sessions,
                streak logic, rewards, badges, and notifications.
              </p>
            </article>

            <form className="auth-card" onSubmit={onAuthSubmit}>
              <h2>{authMode === "login" ? "Sign in" : "Create account"}</h2>
              <label>
                Email
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  minLength={8}
                />
              </label>
              {authMode === "register" ? (
                <label>
                  Display name
                  <input
                    value={authForm.display_name}
                    onChange={(event) => setAuthForm((prev) => ({ ...prev, display_name: event.target.value }))}
                  />
                </label>
              ) : null}
              <button type="submit" className="button button--primary">
                {authMode === "login" ? "Sign in" : "Create and sign in"}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}
              >
                {authMode === "login" ? "Need an account? Register" : "Already have account? Login"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <nav className="segmented-nav fade-up" aria-label="Primary">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={activeView === item.id ? "segmented-nav__item is-active" : "segmented-nav__item"}
                  onClick={() => setActiveView(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            {renderMainContent()}
          </>
        )}
      </main>

      {focusOverlayOpen && activeSession ? (
        <section className="focus-overlay" aria-label="Deep work overlay">
          <div className="focus-overlay__card">
            <p className="eyebrow">Deep Work</p>
            <h2>{selectedSkill?.name || "Focus session"}</h2>
            <p className="focus-overlay__meta">
              Started {formatDate(activeSession.started_at)} · Pomodoros {activeSession.pomodoros_completed}
            </p>
            <div className="focus-overlay__actions">
              <button type="button" className="button" onClick={logFocusCycle}>Log focus cycle</button>
              <button type="button" className="button button--primary" onClick={endSession}>End session</button>
            </div>
            <button type="button" className="button button--ghost" onClick={() => setFocusOverlayOpen(false)}>
              Exit focus view
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}

export default App;
