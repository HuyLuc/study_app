function SegmentedNav({ items, activeView, onChange }) {
  return (
    <nav className="segmented-nav fade-up" aria-label="Primary">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={activeView === item.id ? "segmented-nav__item is-active" : "segmented-nav__item"}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export default SegmentedNav;
