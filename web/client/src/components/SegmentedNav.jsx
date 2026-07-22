import { NAV_ICONS } from "./icons";

function SegmentedNav({ items, activeView, onChange, variant = "default" }) {
  const navClassName = variant === "rail" ? "segmented-nav segmented-nav--rail fade-up" : "segmented-nav fade-up";

  return (
    <nav className={navClassName} aria-label="Primary">
      {items.map((item) => {
        const Icon = NAV_ICONS[item.id];

        return (
          <button
            key={item.id}
            type="button"
            className={activeView === item.id ? "segmented-nav__item is-active" : "segmented-nav__item"}
            onClick={() => onChange(item.id)}
          >
            {Icon ? (
              <span className="segmented-nav__icon">
                <Icon />
              </span>
            ) : null}
            <span className="segmented-nav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default SegmentedNav;
