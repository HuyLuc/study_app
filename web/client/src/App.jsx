import { useEffect, useState } from "react";
import FocusOverlay from "./components/FocusOverlay";
import SegmentedNav from "./components/SegmentedNav";
import TopNav from "./components/TopNav";
import { IconBell, IconLogout, IconMoon, IconPlus, IconSun } from "./components/icons";
import { NAV_ITEMS } from "./constants/navigation";
import { useStudyAppController } from "./hooks/useStudyAppController";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import JournalPage from "./pages/JournalPage";
import OnboardingPage from "./pages/OnboardingPage";
import PomodoroPage from "./pages/PomodoroPage";
import ProfilePage from "./pages/ProfilePage";

const THEME_STORAGE_KEY = "study_app_theme";

function App() {
  const controller = useStudyAppController();

  const {
    isBootstrapping,
    busyLabel,
    notice,
    user,
    activeView,
    setActiveView,
    onLogout,
    focusOverlayOpen,
    enterFocusMode,
    closeFocusMode,
    focusClockStyle,
    focusMusicTrack,
    focusMusicEnabled,
    focusMusicVolume,
    activeSession,
    selectedSkill,
    skills,
    setSelectedSkillId,
    unreadNotifications,
    logFocusCycle,
    endSession,
    authMode,
    authForm,
    setAuthForm,
    onAuthSubmit,
    setAuthMode,
  } = controller;

  const [themePreference, setThemePreference] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || null);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => setSystemPrefersDark(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (themePreference === "light" || themePreference === "dark") {
      document.documentElement.dataset.theme = themePreference;
      localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    } else {
      delete document.documentElement.dataset.theme;
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  }, [themePreference]);

  const isDarkActive = themePreference ? themePreference === "dark" : systemPrefersDark;

  const workspaceStatusText = activeSession
    ? `Phiên tập trung: đang chạy${selectedSkill ? ` • ${selectedSkill.name}` : ""}`
    : selectedSkill
      ? `Kỹ năng hiện tại: ${selectedSkill.name}`
      : "Chưa bắt đầu phiên tập trung";

  if (isBootstrapping) {
    return (
      <main className="loading-shell">
        <div className="loading-orb" />
        <p>Preparing workspace...</p>
      </main>
    );
  }

  return (
    <div className="app-frame">
      <div className="background-layers" aria-hidden="true">
        <span className="halo halo--a" />
        <span className="halo halo--b" />
        <span className="halo halo--c" />
      </div>

      <TopNav statusText={user ? workspaceStatusText : undefined} />

      <main className="app-shell">
        {notice.text ? <div className={`notice notice--${notice.tone || "neutral"}`}>{notice.text}</div> : null}
        {busyLabel ? <div className="busy-chip">{busyLabel}</div> : null}

        {!user ? (
          <AuthPage
            authMode={authMode}
            authForm={authForm}
            setAuthForm={setAuthForm}
            onAuthSubmit={onAuthSubmit}
            setAuthMode={setAuthMode}
          />
        ) : (
          <div className="workspace-shell">
            <aside className="workspace-rail fade-up">
              <div className="rail-brand" aria-hidden="true">
                <span className="rail-brand__mark">HT</span>
              </div>

              <SegmentedNav items={NAV_ITEMS} activeView={activeView} onChange={setActiveView} variant="rail" />

              <div className="rail-divider" />
              <div className="rail-shortcuts">
                {skills.slice(0, 4).map((skill, index) => (
                  <button
                    key={skill.id}
                    type="button"
                    className="rail-shortcut"
                    onClick={() => {
                      setSelectedSkillId(skill.id);
                      setActiveView("dashboard");
                    }}
                  >
                    <span className={`rail-shortcut__dot rail-shortcut__dot--${index % 4}`} aria-hidden="true" />
                    <span className="rail-shortcut__label">{skill.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="rail-shortcut rail-shortcut--add"
                  onClick={() => setActiveView("onboarding")}
                  aria-label="Thêm kỹ năng mới"
                >
                  <IconPlus />
                </button>
              </div>

              <div className="rail-divider" />
              <div className="rail-utility">
                <button
                  type="button"
                  className="segmented-nav__item"
                  onClick={() => setActiveView("dashboard")}
                >
                  <span className="segmented-nav__icon">
                    <IconBell />
                    {unreadNotifications.length > 0 ? <span className="rail-badge-dot" aria-hidden="true" /> : null}
                  </span>
                  <span className="segmented-nav__label">Thông báo</span>
                </button>
                <button type="button" className="segmented-nav__item" onClick={onLogout}>
                  <span className="segmented-nav__icon">
                    <IconLogout />
                  </span>
                  <span className="segmented-nav__label">Đăng xuất</span>
                </button>
              </div>

              <div className="rail-theme-toggle" role="group" aria-label="Giao diện sáng / tối">
                <button
                  type="button"
                  className={!isDarkActive ? "rail-theme-toggle__option is-active" : "rail-theme-toggle__option"}
                  onClick={() => setThemePreference("light")}
                >
                  <IconSun />
                  Sáng
                </button>
                <button
                  type="button"
                  className={isDarkActive ? "rail-theme-toggle__option is-active" : "rail-theme-toggle__option"}
                  onClick={() => setThemePreference("dark")}
                >
                  <IconMoon />
                  Tối
                </button>
              </div>
            </aside>

            <section className="workspace-main fade-up">
              <MainContent controller={controller} />
            </section>
          </div>
        )}
      </main>

      <FocusOverlay
        isOpen={focusOverlayOpen}
        activeSession={activeSession}
        selectedSkill={selectedSkill}
        focusClockStyle={focusClockStyle}
        focusMusicTrack={focusMusicTrack}
        focusMusicEnabled={focusMusicEnabled}
        focusMusicVolume={focusMusicVolume}
        onLogFocusCycle={logFocusCycle}
        onEndSession={endSession}
        onClose={closeFocusMode}
      />
    </div>
  );
}

function MainContent({ controller }) {
  const {
    activeView,
    profile,
    streak,
    skills,
    selectedSkill,
    selectedSkillId,
    unreadNotifications,
    notifications,
    setSelectedSkillId,
    setActiveView,
    markAllNotificationsRead,
    markNotificationRead,
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
    sessionForm,
    setSessionForm,
    startSession,
    activeSession,
    focusClockStyle,
    setFocusClockStyle,
    focusMusicTrack,
    setFocusMusicTrack,
    focusMusicEnabled,
    setFocusMusicEnabled,
    focusMusicVolume,
    setFocusMusicVolume,
    enterFocusMode,
    logFocusCycle,
    endSession,
    sessionSummary,
    lootRevealSeed,
    latestReward,
    isLootRevealed,
    setIsLootRevealed,
    sessions,
    flashcardForm,
    setFlashcardForm,
    createFlashcard,
    flashcardsDue,
    revealedFlashcards,
    toggleFlashcardReveal,
    reviewCard,
    flashcardStats,
    journalForm,
    setJournalForm,
    createJournalEntry,
    journalEntries,
    badges,
    allBadges,
    leaderboard,
    rewardsHistory,
    rewardsPool,
    buyFreeze,
    inAppPreferences,
    togglePreference,
  } = controller;

  if (activeView === "onboarding") {
    return (
      <OnboardingPage
        skillForm={skillForm}
        setSkillForm={setSkillForm}
        createSkill={createSkill}
        subSkillForm={subSkillForm}
        setSubSkillForm={setSubSkillForm}
        createSubSkill={createSubSkill}
        latestSubSkill={latestSubSkill}
        taskForm={taskForm}
        setTaskForm={setTaskForm}
        createTask={createTask}
        latestTask={latestTask}
        commitmentForm={commitmentForm}
        setCommitmentForm={setCommitmentForm}
        createCommitment={createCommitment}
        commitment={commitment}
      />
    );
  }

  if (activeView === "pomodoro") {
    return (
      <PomodoroPage
        selectedSkillId={selectedSkillId}
        setSelectedSkillId={setSelectedSkillId}
        skills={skills}
        sessionForm={sessionForm}
        setSessionForm={setSessionForm}
        startSession={startSession}
        activeSession={activeSession}
        focusClockStyle={focusClockStyle}
        setFocusClockStyle={setFocusClockStyle}
        focusMusicTrack={focusMusicTrack}
        setFocusMusicTrack={setFocusMusicTrack}
        focusMusicEnabled={focusMusicEnabled}
        setFocusMusicEnabled={setFocusMusicEnabled}
        focusMusicVolume={focusMusicVolume}
        setFocusMusicVolume={setFocusMusicVolume}
        enterFocusMode={enterFocusMode}
        logFocusCycle={logFocusCycle}
        endSession={endSession}
        sessionSummary={sessionSummary}
        lootRevealSeed={lootRevealSeed}
        latestReward={latestReward}
        isLootRevealed={isLootRevealed}
        setIsLootRevealed={setIsLootRevealed}
        sessions={sessions}
      />
    );
  }

  if (activeView === "flashcards") {
    return (
      <FlashcardsPage
        selectedSkillId={selectedSkillId}
        selectedSkill={selectedSkill}
        flashcardForm={flashcardForm}
        setFlashcardForm={setFlashcardForm}
        createFlashcard={createFlashcard}
        flashcardsDue={flashcardsDue}
        revealedFlashcards={revealedFlashcards}
        toggleFlashcardReveal={toggleFlashcardReveal}
        reviewCard={reviewCard}
        flashcardStats={flashcardStats}
      />
    );
  }

  if (activeView === "journal") {
    return (
      <JournalPage
        selectedSkillId={selectedSkillId}
        journalForm={journalForm}
        setJournalForm={setJournalForm}
        createJournalEntry={createJournalEntry}
        journalEntries={journalEntries}
      />
    );
  }

  if (activeView === "profile") {
    return (
      <ProfilePage
        profile={profile}
        streak={streak}
        badges={badges}
        allBadges={allBadges}
        leaderboard={leaderboard}
        rewardsHistory={rewardsHistory}
        rewardsPool={rewardsPool}
        buyFreeze={buyFreeze}
        inAppPreferences={inAppPreferences}
        togglePreference={togglePreference}
      />
    );
  }

  return (
    <DashboardPage
      profile={profile}
      streak={streak}
      skills={skills}
      selectedSkill={selectedSkill}
      selectedSkillId={selectedSkillId}
      unreadNotifications={unreadNotifications}
      notifications={notifications}
      onSelectSkill={setSelectedSkillId}
      onOpenOnboarding={() => setActiveView("onboarding")}
      onMarkAllNotificationsRead={markAllNotificationsRead}
      onMarkNotificationRead={markNotificationRead}
    />
  );
}

export default App;
