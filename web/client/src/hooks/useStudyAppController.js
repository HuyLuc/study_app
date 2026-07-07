import { useEffect, useMemo, useRef, useState } from "react";

import { ApiError, apiClient } from "../api/client";
import { authApi, gamificationApi, learningApi, notificationApi } from "../api/services";

const defaultSkillForm = { name: "", description: "", target_hours: 20 };
const defaultAuthForm = { email: "", password: "", display_name: "" };
const defaultSubSkillForm = { name: "", is_core: true, order_index: 0 };
const defaultTaskForm = { title: "", estimated_minutes: 5 };
const defaultCommitmentForm = { target_hours: 5 };
const defaultSessionForm = { focus_duration: 50, break_duration: 10 };
const defaultFlashcardForm = { front: "", back: "" };
const defaultJournalForm = { title: "", description: "", lesson_learned: "" };

export function useStudyAppController() {
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

  const noticeTimerRef = useRef(null);

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

    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
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

    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
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

  return {
    isBootstrapping,
    busyLabel,
    notice,
    authMode,
    setAuthMode,
    authForm,
    setAuthForm,
    user,
    activeView,
    setActiveView,
    skills,
    selectedSkillId,
    setSelectedSkillId,
    selectedSkill,
    unreadNotifications,
    inAppPreferences,
    latestReward,
    skillForm,
    setSkillForm,
    subSkillForm,
    setSubSkillForm,
    taskForm,
    setTaskForm,
    commitmentForm,
    setCommitmentForm,
    sessionForm,
    setSessionForm,
    flashcardForm,
    setFlashcardForm,
    journalForm,
    setJournalForm,
    latestSubSkill,
    latestTask,
    commitment,
    activeSession,
    sessionSummary,
    sessions,
    flashcardsDue,
    flashcardStats,
    journalEntries,
    profile,
    streak,
    leaderboard,
    badges,
    allBadges,
    rewardsHistory,
    rewardsPool,
    notifications,
    preferences,
    focusOverlayOpen,
    setFocusOverlayOpen,
    revealedFlashcards,
    lootRevealSeed,
    isLootRevealed,
    setIsLootRevealed,
    onAuthSubmit,
    onLogout,
    createSkill,
    createSubSkill,
    createTask,
    createCommitment,
    startSession,
    logFocusCycle,
    endSession,
    createFlashcard,
    reviewCard,
    toggleFlashcardReveal,
    createJournalEntry,
    markNotificationRead,
    markAllNotificationsRead,
    togglePreference,
    buyFreeze,
  };
}
