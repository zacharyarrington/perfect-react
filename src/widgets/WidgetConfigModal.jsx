// WidgetConfigModal — the no-code settings form for one widget instance.
// Opened from a widget's "Settings" menu item (see WidgetFrame.jsx /
// DashboardCanvas.jsx). Also doubles as the "name & save as template" step
// when saving a widget as a reusable template (a later stage) reuses this
// same title field.

import { useState } from 'react'
import Modal from '../components/ui/Modal'
import useForm from '../components/forms/useForm'
import Field from '../components/forms/Field'
import useAppStore from '../store/useAppStore'
import useDashboardStore from '../dashboards/useDashboardStore'
import { WIDGET_TYPES_BY_ID } from './widgets.config'
import ConfigSchemaForm, { buildValidate, flattenInstance, splitValues } from './configSchema'

export default function WidgetConfigModal({ dashboardId, instance, onClose }) {
  const addToast = useAppStore((s) => s.addToast)
  const updateWidget = useDashboardStore((s) => s.updateWidget)
  const [sourceChangedNotice, setSourceChangedNotice] = useState(false)

  const type = instance ? WIDGET_TYPES_BY_ID[instance.type] : null
  const schema = type?.configSchema || []

  const form = useForm({
    initialValues: instance ? { title: instance.title || '', ...flattenInstance(instance) } : {},
    validate: (values) => ({
      ...buildValidate(schema)(values),
      // title has no schema entry (every type gets it for free) so it isn't
      // covered by buildValidate — nothing required here, just present so
      // useForm's shape stays consistent.
    }),
    onSubmit: async (values) => {
      const { title, ...rest } = values
      const { binding, config } = splitValues(schema, rest)
      updateWidget(dashboardId, instance.id, { title, binding, config })
      addToast({ type: 'success', message: `"${title || type.title}" updated` })
      onClose()
    },
  })

  if (!instance || !type) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={`${type.title} settings`}
      width={440}
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
        <Field.Text label="Title" {...form.field('title')} placeholder={type.title} />
        <ConfigSchemaForm
          schema={schema}
          form={form}
          onSourceChanged={() => setSourceChangedNotice(true)}
        />
        {sourceChangedNotice && (
          <p className="field-hint" style={{ marginTop: -8, marginBottom: 12 }}>
            Some field selections were cleared because they don't exist on the new data source.
          </p>
        )}
        {form.submitError && <div className="field-error" style={{ marginBottom: 12 }}>{form.submitError}</div>}
      </form>
    </Modal>
  )
}
