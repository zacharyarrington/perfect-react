// WidgetPickerPanel — lists the built-in widget types AND saved widget
// templates (a user's own configured widgets); click either to add it to
// the currently active dashboard. Templates can be exported/imported as
// .widget.json files right from here.
//
// Reads the active dashboard straight from useDashboardStore rather than
// via props, since floating panels are mounted globally by PanelHost and
// aren't scoped to whichever page happens to be showing.

import { useCallback, useEffect, useRef, useState } from 'react'
import FloatingPanel from '../panels/FloatingPanel'
import useAppStore from '../store/useAppStore'
import useDashboardStore from '../dashboards/useDashboardStore'
import WIDGET_TYPES from './widgets.config'
import {
  listWidgetTemplates, deleteWidgetTemplate, exportWidgetTemplate,
  importWidgetTemplateFromFile, instantiateWidgetTemplate,
} from './widgetTemplates'
import {
  IconApps, IconFileImport, IconDownload, IconTrash,
} from '@tabler/icons-react'

export default function WidgetPickerPanel() {
  const addToast = useAppStore((s) => s.addToast)
  const { dashboards, activeDashboardId, addWidget } = useDashboardStore()
  const dashboard = dashboards.find((d) => d.id === activeDashboardId)
  const [templates, setTemplates] = useState([])
  const [importing, setImporting] = useState(false)
  const importRef = useRef(null)

  const refresh = useCallback(() => listWidgetTemplates().then(setTemplates), [])
  useEffect(() => { refresh() }, [refresh])

  const handleAddType = (type) => {
    if (!dashboard) {
      addToast({ type: 'warning', message: 'Open a dashboard first' })
      return
    }
    addWidget(dashboard.id, { type: type.id })
    addToast({ type: 'success', message: `${type.title} added to "${dashboard.name}"` })
  }

  const handleAddTemplate = async (template) => {
    if (!dashboard) {
      addToast({ type: 'warning', message: 'Open a dashboard first' })
      return
    }
    try {
      const { widgetData, rehydratedCount } = await instantiateWidgetTemplate(template)
      addWidget(dashboard.id, widgetData)
      addToast({
        type: 'success',
        message: rehydratedCount > 0
          ? `"${template.name}" added — embedded dataset restored`
          : `"${template.name}" added to "${dashboard.name}"`,
      })
    } catch (e) {
      addToast({ type: 'error', message: `Couldn't add template: ${e.message}` })
    }
  }

  const handleExport = async (e, template) => {
    e.stopPropagation()
    try {
      await exportWidgetTemplate(template)
    } catch (err) {
      addToast({ type: 'error', message: `Export failed: ${err.message}` })
    }
  }

  const handleDelete = async (e, template) => {
    e.stopPropagation()
    await deleteWidgetTemplate(template.id)
    refresh()
    addToast({ type: 'info', message: `Deleted "${template.name}"` })
  }

  const handleImport = async (file) => {
    if (!file) return
    setImporting(true)
    try {
      const template = await importWidgetTemplateFromFile(file)
      refresh()
      addToast({ type: 'success', message: `Imported "${template.name}"` })
    } catch (e) {
      addToast({ type: 'error', message: `Import failed: ${e.message}` })
    } finally {
      setImporting(false)
      importRef.current.value = ''
    }
  }

  return (
    <FloatingPanel
      panelKey="widgets"
      title="Add Widget"
      icon={<IconApps size={16} />}
      defaultWidth={300}
      defaultHeight={480}
    >
      {templates.length > 0 && (
        <div className="panel-section">
          <div className="section-label">Your templates</div>
          <div className="widget-picker-list">
            {templates.map((tpl) => (
              // A plain <button> can't contain the Export/Delete <button>s below
              // (invalid HTML — nested interactive elements produce unpredictable
              // click bubbling and a React hydration warning), so this is a div
              // with button semantics reproduced by hand: role, tabIndex, and an
              // onKeyDown so Enter/Space still activate it like a real button.
              <div
                key={tpl.id}
                className="widget-picker-item"
                role="button"
                tabIndex={dashboard ? 0 : -1}
                aria-disabled={!dashboard}
                onClick={() => dashboard && handleAddTemplate(tpl)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && dashboard) {
                    e.preventDefault()
                    handleAddTemplate(tpl)
                  }
                }}
              >
                <span className="widget-picker-item-icon">
                  {WIDGET_TYPES.find((t) => t.id === tpl.widget.type)?.icon}
                </span>
                <span className="widget-picker-item-body">
                  <span className="widget-picker-item-title">{tpl.name}</span>
                  <span className="widget-picker-item-desc">{tpl.description || 'Custom widget'}</span>
                </span>
                <span className="widget-picker-item-actions">
                  <button className="btn btn-icon btn-ghost btn-xs" data-tooltip="Export" onClick={(e) => handleExport(e, tpl)}>
                    <IconDownload size={12} />
                  </button>
                  <button className="btn btn-icon btn-ghost btn-xs" data-tooltip="Delete" onClick={(e) => handleDelete(e, tpl)}>
                    <IconTrash size={12} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel-section">
        <div className="section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Widget types</span>
          <button className="btn-link" style={{ fontSize: 'var(--text-xs)', padding: 0 }} onClick={() => importRef.current?.click()} disabled={importing}>
            <IconFileImport size={12} /> Import file
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
        </div>
        <div className="widget-picker-list">
          {WIDGET_TYPES.map((type) => (
            <button
              key={type.id}
              className="widget-picker-item"
              onClick={() => handleAddType(type)}
              disabled={!dashboard}
            >
              <span className="widget-picker-item-icon">{type.icon}</span>
              <span className="widget-picker-item-body">
                <span className="widget-picker-item-title">{type.title}</span>
                <span className="widget-picker-item-desc">{type.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {!dashboard && (
        <div className="panel-section">
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Open a dashboard to add widgets to it.
          </p>
        </div>
      )}
    </FloatingPanel>
  )
}
