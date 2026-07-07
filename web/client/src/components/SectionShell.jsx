function SectionShell({ title, subtitle, children }) {
  return (
    <section className="panel panel--spacious fade-up">
      <header className="panel__header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

export default SectionShell;
