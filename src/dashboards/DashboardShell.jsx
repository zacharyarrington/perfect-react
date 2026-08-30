// DashboardShell — the /dashboard and /dashboard/:dashboardId route target.
// Reads the dashboard id from the URL (falling back to the store's active
// one so /dashboard alone still works), renders the tab strip + canvas, and
// keeps the URL and the store's activeDashboardId in sync so every
// dashboard is deep-linkable.
//
// Also registers a "Go to <dashboard>" command-palette entry per dashboard
// (plus "New dashboard"), re-registered whenever the dashboard list changes
// so renames/creates/deletes show up immediately.

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useDashboardStore from './useDashboardStore'
import useAppStore from '../store/useAppStore'
import DashboardTabs from './DashboardTabs'
import DashboardCanvas from './DashboardCanvas'
import WidgetConfigModal from '../widgets/WidgetConfigModal'
import { Modal, PageHeader, EmptyState } from '../components/ui'
import { Field, useForm } from '../components/forms'
import { saveWidgetTemplate } from '../widgets/widgetTemplates'
import { WIDGET_TYPES_BY_ID } from '../widgets/widgets.config'
import { registerCommand } from '../command/commandRegistry'
import { IconPlus, IconLayoutBoard, IconLayoutDashboard } from '@tabler/icons-react'

function SaveWidgetTemplateModal({ instance, onClose }) {
  const addToast = useAppStore((s) => s.addToast)
  const type = instance ? WIDGET_TYPES_BY_ID[instance.type] : null
  const form = useForm({
    initialValues: { name: instance ? (instance.title || type?.title || 'Widget') : '', description: '' },
    validate: (v) => ({ name: !v.name.trim() ? 'Name is required' : null }),
    onSubmit: async (values) => {
      await saveWidgetTemplate(instance, values.name, values.description)
      addToast({ type: 'success', message: `Saved "${values.name}" as a widget template` })
      onClose()
    },
  })

  return (
    <Modal
      open={Boolean(instance)}
      onClose={onClose}
      title="Save widget as template"
      width={400}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={form.handleSubmit} disabled={form.submitting}>
            {form.submitting ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form onSubmit={form.handleSubmit}>
        <Field.Text label="Name" required {...form.field('name')} />
        <Field.Textarea label="Description" hint="Optional" rows={2} {...form.field('description')} />
        <p className="field-hint">
          Saved templates appear in the widget picker alongside the built-in types.
        </p>
      </form>
    </Modal>
  )
}

export default function DashboardShell() {
  const { dashboardId } = useParams()
  const navigate = useNavigate()
  const { dashboards, loaded, activeDashboardId, setActiveDashboard, createDashboard } = useDashboardStore()
  const togglePanel = useAppStore((s) => s.togglePanel)
  const [configuringWidget, setConfiguringWidget] = useState(null)
  const [templatingWidget, setTemplatingWidget] = useState(null)

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

  // Command palette entries: jump straight to any dashboard by name, or
  // create a new one, without leaving the keyboard. Re-registered whenever
  // the dashboard list changes so a rename/create/delete is reflected
  // immediately — registerCommand replaces by id, so this is safe to call
  // on every change rather than only once.
  useEffect(() => {
    const unregisters = dashboards.map((d) => registerCommand({
      id: `dashboard:${d.id}`,
      section: 'Dashboards',
      icon: <IconLayoutDashboard size={16} />,
      label: `Go to "${d.name}"`,
      run: () => navigate(`/dashboard/${d.id}`),
    }))
    unregisters.push(registerCommand({
      id: 'dashboard:new',
      section: 'Dashboards',
      icon: <IconPlus size={16} />,
      label: 'New dashboard',
      run: () => navigate(`/dashboard/${createDashboard({})}`),
    }))
    return () => unregisters.forEach((fn) => fn())
  }, [dashboards, navigate, createDashboard])

  if (!loaded) return null

  // Two distinct reasons dashboard can be missing: no dashboards exist at
  // all (dashboardId is absent — see the fallback chain above), vs. a stale
  // or mistyped deep link to a dashboard that's been deleted (dashboardId
  // is present but matches nothing). Collapsing these into one message
  // would tell someone with 5 real dashboards "no dashboards yet", which is
  // actively misleading about what actually happened to their link.
  if (!dashboard) {
    const staleLink = Boolean(dashboardId)
    return (
      <div className="page">
        <PageHeader title="Dashboards" />
        <EmptyState
          icon={<IconLayoutBoard size={32} />}
          title={staleLink ? "This dashboard doesn't exist" : 'No dashboards yet'}
          desc={staleLink ? "It may have been deleted. Here's a link back to your dashboards." : 'Create one to start adding widgets.'}
          action={staleLink ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>
              Go to dashboards
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/dashboard/${createDashboard({})}`)}>
              <IconPlus size={14} /> New dashboard
            </button>
          )}
        />
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
        onConfigureWidget={setConfiguringWidget}
        onSaveWidgetTemplate={setTemplatingWidget}
      />
      {configuringWidget && (
        <WidgetConfigModal
          dashboardId={dashboard.id}
          instance={configuringWidget}
          onClose={() => setConfiguringWidget(null)}
        />
      )}
      <SaveWidgetTemplateModal instance={templatingWidget} onClose={() => setTemplatingWidget(null)} />
    </div>
  )
}
