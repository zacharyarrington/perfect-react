// EmptyState — standard "nothing here yet" block with optional action.
//
//   <EmptyState icon={<IconInbox size={32}/>} title="No reports"
//               desc="Create your first report to get started."
//               action={<button className="btn btn-primary btn-sm">New report</button>} />

export default function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <div className="empty-state-title">{title}</div>
      {desc && <div className="empty-state-desc">{desc}</div>}
      {action}
    </div>
  )
}
