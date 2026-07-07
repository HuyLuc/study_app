function AuthPage({ authMode, authForm, setAuthForm, onAuthSubmit, setAuthMode }) {
  return (
    <section className="auth-layout fade-up">
      <article className="hero-card">
        <p className="eyebrow">20-hour challenge</p>
        <h1>Build focus, then let momentum run itself.</h1>
        <p>
          This client connects to your FastAPI microservices for skills, Pomodoro sessions, streak logic, rewards,
          badges, and notifications.
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
  );
}

export default AuthPage;
