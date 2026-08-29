// DashboardPage — thin route target; all real logic lives in DashboardShell
// (tabs, canvas, widget rendering). Kept as its own file because the page
// registry expects a stable import path here.

import DashboardShell from '../dashboards/DashboardShell'

export default function DashboardPage() {
  return <DashboardShell />
}
