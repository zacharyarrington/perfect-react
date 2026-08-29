// DashboardShell — the /dashboard and /dashboard/:dashboardId route target.
// Reads the dashboard id from the URL (falling back to the store's active
// one so /dashboard alone still works), renders the tab strip + canvas, and
// keeps the URL and the store's activeDashboardId in sync so every
// dashboard is deep-linkable.

import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useDashboardStore from './useDashboardStore'
import DashboardTabs from './DashboardTabs'
import DashboardCanvas from './DashboardCanvas'
import { PageHeader } from '../components/ui'
import { IconPlus } from '@tabler/icons-react'

// TEMPORARY (stage 2 only): the real widget picker panel lands in stage 3.
// Until then this button exercises addWidget directly so drag/resize/
// persistence can be verified without waiting on the picker UI.
const SAMPLE_WIDGET_TYPES = ['stat', 'chart', 'table', 'text']

export default function DashboardShell() {
  const { dashboardId } = useParams()
  const navigate = useNavigate()
  const { dashboards, loaded, activeDashboardId, setActiveDashboard, addWidget } = useDashboardStore()

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

  const addSampleWidget = () => {
    const type = SAMPLE_WIDGET_TYPES[dashboard.widgets.length % SAMPLE_WIDGET_TYPES.length]
    addWidget(dashboard.id, { type, title: `${type} widget ${dashboard.widgets.length + 1}` })
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-toolbar">
        <DashboardTabs activeDashboardId={dashboard.id} />
        <button className="btn btn-ghost btn-sm" onClick={addSampleWidget}>
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
