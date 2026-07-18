function formatTimeParts(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return { minutes, seconds };
}

function CountdownDisplay({ remainingMs, totalDurationMs, mode = "halo", className = "" }) {
  const { minutes, seconds } = formatTimeParts(remainingMs);

  const safeTotal = Math.max(totalDurationMs, 1);
  const progress = Math.max(0, Math.min(1, remainingMs / safeTotal));
  const elapsed = 1 - progress;

  if (mode === "split") {
    return (
      <div className={`countdown-display countdown-display--split ${className}`.trim()}>
        <div className="countdown-display__split-cell">
          <span>{minutes}</span>
          <small>PHÚT</small>
        </div>
        <div className="countdown-display__split-sep">:</div>
        <div className="countdown-display__split-cell">
          <span>{seconds}</span>
          <small>GIÂY</small>
        </div>
      </div>
    );
  }

  if (mode === "zen") {
    return (
      <div className={`countdown-display countdown-display--zen ${className}`.trim()}>
        <p className="countdown-display__zen-time">
          {minutes}:{seconds}
        </p>
        <div className="countdown-display__zen-bar">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>
    );
  }

  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * elapsed;

  return (
    <div className={`countdown-display countdown-display--halo ${className}`.trim()}>
      <svg viewBox="0 0 260 260" className="countdown-display__ring" aria-hidden="true">
        <circle cx="130" cy="130" r={radius} className="countdown-display__ring-track" />
        <circle
          cx="130"
          cy="130"
          r={radius}
          className="countdown-display__ring-progress"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <p className="countdown-display__halo-time">
        {minutes}:{seconds}
      </p>
    </div>
  );
}

export default CountdownDisplay;

