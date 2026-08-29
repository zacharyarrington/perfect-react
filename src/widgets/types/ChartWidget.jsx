// ChartWidget — placeholder for stage 1 (store/registry skeleton).
// Wired to real data + Bar/Line/DonutChart in stage 4.
export default function ChartWidget({ instance }) {
  return <div className="widget-placeholder">Chart: {instance.title || 'Untitled'}</div>
}
