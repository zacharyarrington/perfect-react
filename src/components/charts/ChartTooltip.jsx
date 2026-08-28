// ChartTooltip — design-system-styled tooltip content for all chart wrappers.

export default function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null
  const fmt = valueFormatter || ((v) => (typeof v === 'number' ? v.toLocaleString() : v))

  return (
    <div className="chart-tooltip">
      {label != null && <div className="chart-tooltip-label">{label}</div>}
      {payload.map((entry) => (
        <div key={entry.dataKey ?? entry.name} className="chart-tooltip-row">
          <span className="chart-tooltip-swatch" style={{ background: entry.color || entry.payload?.fill }} />
          <span className="chart-tooltip-name">{entry.name}</span>
          <span className="chart-tooltip-value mono">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}
