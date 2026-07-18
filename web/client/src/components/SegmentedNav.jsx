function SegmentedNav({ items, activeView, onChange, variant = "default" }) {
  const navClassName = variant === "rail" ? "segmented-nav segmented-nav--rail fade-up" : "segmented-nav fade-up";

  return (
    <nav className={navClassName} aria-label="Primary">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={activeView === item.id ? "segmented-nav__item is-active" : "segmented-nav__item"}
          onClick={() => onChange(item.id)}
        >
          <span className="segmented-nav__index">{String(index + 1).padStart(2, "0")}</span>
          <span className="segmented-nav__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default SegmentedNav;
