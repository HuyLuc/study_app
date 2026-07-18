function TopNav({ user, onLogout }) {
  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <div>
          <p className="top-nav__brand">Học Tập Tối Ưu</p>
          <p className="top-nav__sub">Bảng điều khiển học tập cá nhân</p>
        </div>
        <div className="top-nav__actions">
          <a className="button-link" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            Tài liệu API
          </a>
          {user ? (
            <button type="button" className="button" onClick={onLogout}>
              Đăng xuất
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default TopNav;
