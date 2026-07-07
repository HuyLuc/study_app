const services = [
  { name: "API Gateway", url: "http://localhost:8000/health" },
  { name: "Auth Service", url: "http://localhost:8001/health" },
  { name: "Learning Service", url: "http://localhost:8002/health" },
  { name: "Gamification Service", url: "http://localhost:8003/health" },
  { name: "Notification Service", url: "http://localhost:8004/health" },
];

function App() {
  return (
    <main className="app">
      <section className="hero">
        <p className="eyebrow">Study App Platform</p>
        <h1>Microservices + Clean Architecture Skeleton</h1>
        <p>
          Frontend React and backend FastAPI services are wired through Docker
          Compose for local development.
        </p>
      </section>

      <section className="grid">
        {services.map((service) => (
          <article key={service.name} className="card">
            <h2>{service.name}</h2>
            <a href={service.url} target="_blank" rel="noreferrer">
              {service.url}
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;