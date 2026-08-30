// DashboardShell — the /dashboard and /dashboard/:dashboardId route target.
// Reads the dashboard id from the URL (falling back to the store's active
// one so /dashboard alone still works), renders the tab strip + canvas, and
// keeps the URL and the store's activeDashboardId in sync so every
// dashboard is deep-linkable.

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useDashboardStore from './useDashboardStore'
import useAppStore from '../store/useAppStore'
import DashboardTabs from './DashboardTabs'
import DashboardCanvas from './DashboardCanvas'
import WidgetConfigModal from '../widgets/WidgetConfigModal'
import { Modal, PageHeader } from '../components/ui'
import { Field, useForm } from '../components/forms'
import { saveWidgetTemplate } from '../widgets/widgetTemplates'
import { WIDGET_TYPES_BY_ID } from '../widgets/widgets.config'
import { IconPlus } from '@tabler/icons-react'

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
  const { dashboards, loaded, activeDashboardId, setActiveDashboard } = useDashboardStore()
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
