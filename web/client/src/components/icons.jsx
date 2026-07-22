const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconHome(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function IconLayers(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3.5 21 8l-9 4.5L3 8Z" />
      <path d="M3 12.5 12 17l9-4.5" />
      <path d="M3 16.5 12 21l9-4.5" />
    </svg>
  );
}

export function IconTimer(props) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9.5 2.5h5" />
    </svg>
  );
}

export function IconCards(props) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="6" y="4" width="14" height="10" rx="2" />
      <path d="M4 8v10a2 2 0 0 0 2 2h10" />
    </svg>
  );
}

export function IconBook(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 5.5A2 2 0 0 1 6 3.5h5.5v17H6a2 2 0 0 0-2 2Z" />
      <path d="M20 5.5a2 2 0 0 0-2-2h-5.5v17H18a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

export function IconUser(props) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function IconBell(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13.5 6 9.5Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconLogout(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 4.5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" />
      <path d="M15.5 16 20 12l-4.5-4" />
      <path d="M20 12H9" />
    </svg>
  );
}

export function IconPlus(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconSun(props) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

export function IconMoon(props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" />
    </svg>
  );
}

export const NAV_ICONS = {
  dashboard: IconHome,
  onboarding: IconLayers,
  pomodoro: IconTimer,
  flashcards: IconCards,
  journal: IconBook,
  profile: IconUser,
};
