function AuthPage({ authMode, authForm, setAuthForm, onAuthSubmit, setAuthMode }) {
  return (
    <section className="auth-layout fade-up">
      <article className="hero-card">
        <p className="eyebrow">Thử thách 20 giờ</p>
        <h1>Tập trung trước, thói quen sẽ tự hình thành.</h1>
        <p>
          Hệ thống học tập thông minh giúp bạn xây dựng và duy trì thói quen học tập hiệu quả, tích lũy điểm kinh nghiệm (XP), thăng hạng cấp độ, duy trì chuỗi streak và mở khóa những phần quà thú vị.
        </p>
      </article>

      <form className="auth-card" onSubmit={onAuthSubmit}>
        <h2>{authMode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</h2>
        <label>
          Địa chỉ Email
          <input
            type="email"
            value={authForm.email}
            onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>
        <label>
          Mật khẩu
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
            Tên hiển thị
            <input
              value={authForm.display_name}
              onChange={(event) => setAuthForm((prev) => ({ ...prev, display_name: event.target.value }))}
            />
          </label>
        ) : null}
        <button type="submit" className="button button--primary">
          {authMode === "login" ? "Đăng nhập" : "Đăng ký & Đăng nhập"}
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}
        >
          {authMode === "login" ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </form>
    </section>
  );
}

export default AuthPage;
