function TopNav({ user, onLogout }) {
  return (
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
  );
}

export default TopNav;
