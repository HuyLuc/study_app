const services = [
  { name: "API Gateway", status: "Routing + JWT verification", url: "http://localhost:8000/health" },
  { name: "Auth Service", status: "Register / Login / Refresh / Logout", url: "http://localhost:8001/health" },
  { name: "Learning Service", status: "Skill and session domain", url: "http://localhost:8002/health" },
  { name: "Gamification Service", status: "Streak and reward engine", url: "http://localhost:8003/health" },
  { name: "Notification Service", status: "In-app and push orchestration", url: "http://localhost:8004/health" },
];

function App() {
  return (
    <>
      <header className="top-bar">
        <div className="top-bar__inner">
          <p className="top-bar__brand">Optimal Learning App</p>
          <a className="top-bar__cta" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            Open API Docs
          </a>
        </div>
      </header>

      <main className="app">
        <section className="hero">
          <p className="eyebrow">Foundation Sprint</p>
          <h1>Clarity First. Services Ready.</h1>
          <p>
            FastAPI microservices, JWT gateway control, and Docker runtime are prepared
            for the next implementation phases from your plan.
          </p>
        </section>

        <section className="grid">
          {services.map((service) => (
            <article key={service.name} className="card">
              <h2>{service.name}</h2>
              <p>{service.status}</p>
              <a href={service.url} target="_blank" rel="noreferrer">
                {service.url}
              </a>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}

export default App;
