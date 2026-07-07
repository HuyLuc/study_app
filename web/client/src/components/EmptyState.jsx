function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__description">{description}</p> : null}
    </div>
  );
}

export default EmptyState;
