// ProgressBar — determinate progress with optional label.
//
//   <ProgressBar value={62} />
//   <ProgressBar value={8} max={10} label="Storage" showValue />

export default function ProgressBar({ value = 0, max = 100, label, showValue = false, color }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div className="progress">
      {(label || showValue) && (
        <div className="progress-meta">
          {label && <span>{label}</span>}
          {showValue && <span className="mono">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
