// TableWidget — placeholder for stage 1 (store/registry skeleton).
// Wired to real data + DataTable in stage 4.
export default function TableWidget({ instance }) {
  return <div className="widget-placeholder">Table: {instance.title || 'Untitled'}</div>
}
