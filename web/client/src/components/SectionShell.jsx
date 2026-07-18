function SectionShell({ title, subtitle, children, className = "" }) {
  return (
    <section className={`section-shell fade-up ${className}`.trim()}>
      <header className="section-shell__header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      <div className="section-shell__content">{children}</div>
    </section>
  );
}

export default SectionShell;
