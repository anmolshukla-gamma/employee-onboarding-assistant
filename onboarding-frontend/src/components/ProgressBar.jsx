export default function ProgressBar({ percent = 0 }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="progress-pct">{Math.round(clamped)}%</span>
    </div>
  );
}
