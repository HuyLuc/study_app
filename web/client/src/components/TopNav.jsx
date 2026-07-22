function TopNav({ statusText }) {
  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <div className="top-nav__brand-wrap">
          <span className="top-nav__mark" aria-hidden="true">
            HT
          </span>
          <div>
            <p className="top-nav__brand">Học Tập Tối Ưu</p>
            <p className="top-nav__sub">{statusText || "Studio tập trung và tăng tốc kỹ năng"}</p>
          </div>
        </div>
        <div className="top-nav__actions">
          <a className="button-link" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            Tài liệu API
          </a>
        </div>
      </div>
    </header>
  );
}

export default TopNav;
