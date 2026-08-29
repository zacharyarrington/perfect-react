// DashboardShell — the /dashboard and /dashboard/:dashboardId route target.
// Reads the dashboard id from the URL (falling back to the store's active
// one so /dashboard alone still works), renders the tab strip + canvas, and
// keeps the URL and the store's activeDashboardId in sync so every
// dashboard is deep-linkable.

import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useDashboardStore from './useDashboardStore'
import useAppStore from '../store/useAppStore'
import DashboardTabs from './DashboardTabs'
import DashboardCanvas from './DashboardCanvas'
import { PageHeader } from '../components/ui'
import { IconPlus } from '@tabler/icons-react'

export default function DashboardShell() {
  const { dashboardId } = useParams()
  const navigate = useNavigate()
  const { dashboards, loaded, activeDashboardId, setActiveDashboard } = useDashboardStore()
  const togglePanel = useAppStore((s) => s.togglePanel)

  const dashboard = dashboardId
    ? dashboards.find((d) => d.id === dashboardId)
    : dashboards.find((d) => d.id === activeDashboardId) || dashboards[0]

  // Keep the store's "active" pointer in sync with whatever the URL shows,
  // and redirect /dashboard (no id) to a real dashboard once one exists.
  useEffect(() => {
    if (!loaded) return
    if (dashboard && dashboard.id !== activeDashboardId) setActiveDashboard(dashboard.id)
    if (!dashboardId && dashboard) navigate(`/dashboard/${dashboard.id}`, { replace: true })
  }, [loaded, dashboard, dashboardId, activeDashboardId, setActiveDashboard, navigate])

  if (!loaded) return null

  if (!dashboard) {
    return (
      <div className="page">
        <PageHeader title="Dashboards" subtitle="No dashboards yet." />
      </div>
    )
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-toolbar">
        <DashboardTabs activeDashboardId={dashboard.id} />
        <button className="btn btn-ghost btn-sm" onClick={() => togglePanel('widgets')}>
          <IconPlus size={14} /> Add widget
        </button>
      </div>
      <DashboardCanvas
        key={dashboard.id}
        dashboard={dashboard}
        onConfigureWidget={() => {}}
      />
    </div>
  )
}
