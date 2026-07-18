import FocusOverlay from "./components/FocusOverlay";
import SegmentedNav from "./components/SegmentedNav";
import TopNav from "./components/TopNav";
import { NAV_ITEMS } from "./constants/navigation";
import { useStudyAppController } from "./hooks/useStudyAppController";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import JournalPage from "./pages/JournalPage";
import OnboardingPage from "./pages/OnboardingPage";
import PomodoroPage from "./pages/PomodoroPage";
import ProfilePage from "./pages/ProfilePage";

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
    logFocusCycle,
    endSession,
    authMode,
    authForm,
    setAuthForm,
    onAuthSubmit,
    setAuthMode,
  } = controller;

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
        <span className="grid-overlay" />
      </div>

      <TopNav user={user} onLogout={onLogout} />

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
              <p className="workspace-rail__kicker">Learning Workspace</p>
              <h2 className="workspace-rail__title">Lộ trình học tập cá nhân</h2>
              <p className="workspace-rail__subtitle">
                Chọn chế độ làm việc ở thanh bên trái, toàn bộ nội dung chi tiết sẽ hiển thị ở khu vực chính.
              </p>

              <SegmentedNav items={NAV_ITEMS} activeView={activeView} onChange={setActiveView} variant="rail" />

              <div className="workspace-rail__status">
                <p>
                  <strong>Phiên tập trung:</strong> {activeSession ? "Đang chạy" : "Chưa bắt đầu"}
                </p>
                <p>
                  <strong>Kỹ năng hiện tại:</strong> {selectedSkill?.name || "Chưa chọn"}
                </p>
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
