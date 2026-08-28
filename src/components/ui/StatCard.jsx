// StatCard — KPI tile: label, hero value, optional delta vs a prior period.
//
//   <StatCard label="Active users" value="1,284" delta={+12.4} deltaLabel="vs last week" />
//   <StatCard label="Errors" value={9} delta={-3.1} invertDelta />   (down is good)

import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react'

export default function StatCard({ label, value, delta, deltaLabel, invertDelta = false, icon }) {
  const hasDelta = typeof delta === 'number' && !Number.isNaN(delta)
  const good = invertDelta ? delta < 0 : delta > 0
  const flat = hasDelta && delta === 0

  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {icon && <span className="stat-card-icon">{icon}</span>}
      </div>
      <div className="stat-card-value">{value}</div>
      {hasDelta && (
        <div className={`stat-card-delta ${flat ? 'flat' : good ? 'good' : 'bad'}`}>
          {flat ? <IconMinus size={13} /> : delta > 0 ? <IconTrendingUp size={13} /> : <IconTrendingDown size={13} />}
          <span>{delta > 0 ? '+' : ''}{delta}%</span>
          {deltaLabel && <span className="stat-card-delta-label">{deltaLabel}</span>}
        </div>
      )}
    </div>
  )
}
