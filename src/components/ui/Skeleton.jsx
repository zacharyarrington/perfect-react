// Skeleton — shimmering placeholder blocks for content that's still loading,
// so a widget/page reads as "about to appear" rather than blank/frozen.
//
//   <Skeleton />                          a single default bar
//   <Skeleton width={120} height={28} />  one sized block
//   <Skeleton.Text lines={3} />           a paragraph of varying-width lines
//   <Skeleton.Stat />                     shape of a StatCard while loading
//   <Skeleton.Chart />                    shape of a Bar/Line/Donut chart
//   <Skeleton.Table rows={4} />           shape of a DataTable
//   <Skeleton.Page />                     shape of a full page (header + cards)

function Skeleton({ width, height = 16, radius, style, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

function Text({ lines = 3, lastLineWidth = '60%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? lastLineWidth : '100%'} />
      ))}
    </div>
  )
}

function Stat() {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <Skeleton width={90} height={12} />
      </div>
      <Skeleton width={80} height={30} radius={6} />
    </div>
  )
}

function Chart({ height = 220 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '0 4px' }}>
      {[45, 70, 55, 90, 65, 80, 50].map((h, i) => (
        <Skeleton key={i} width="100%" height={`${h}%`} radius={4} className="skeleton-bar" />
      ))}
    </div>
  )
}

function Table({ rows = 4, cols = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={10} width={i === 0 ? '25%' : '15%'} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 12 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={14} width={c === 0 ? '25%' : '15%'} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Full-page shape: a header block plus a grid of card-shaped placeholders —
 *  matches the general "PageHeader + .card" layout most pages use, so the
 *  Suspense fallback for a not-yet-loaded route doesn't flash blank. */
function Page() {
  return (
    <div className="page skeleton-page">
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width={180} height={24} />
        <Skeleton width={320} height={13} />
      </div>
      <div className="card">
        <Skeleton width={140} height={16} style={{ marginBottom: 16 }} />
        <Table rows={3} />
      </div>
    </div>
  )
}

Skeleton.Text = Text
Skeleton.Stat = Stat
Skeleton.Chart = Chart
Skeleton.Table = Table
Skeleton.Page = Page

export default Skeleton
