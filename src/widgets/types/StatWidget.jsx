// StatWidget — placeholder for stage 1 (store/registry skeleton).
// Wired to real data + StatCard in stage 4.
export default function StatWidget({ instance }) {
  return <div className="widget-placeholder">Stat: {instance.title || 'Untitled'}</div>
}
