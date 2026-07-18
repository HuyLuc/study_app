function EmptyState({ title, description, ctaLabel, onCta }) {
  return (
    <div className="empty-state">
      <svg className="empty-state__illustration" viewBox="0 0 80 80" aria-hidden="true">
        <rect x="10" y="12" width="60" height="56" rx="10" />
        <path d="M22 28h36M22 40h24M22 52h30" />
        <circle cx="58" cy="52" r="6" />
      </svg>
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {ctaLabel && onCta ? (
        <button type="button" className="button button--primary empty-state__cta" onClick={onCta}>
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}

export default EmptyState;
