function MetricCard({ label, value, detail }) {
  return (
    <article className="metric-card">
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
      <p className="metric-card__detail">{detail || "Chưa có dữ liệu."}</p>
    </article>
  );
}

export default MetricCard;
