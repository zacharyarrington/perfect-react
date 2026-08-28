// PageHeader — standard page title block with optional action buttons.
//
//   <PageHeader title="Users" subtitle="Manage accounts"
//               actions={<button className="btn btn-primary">Add</button>} />

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>{actions}</div>}
    </div>
  )
}
