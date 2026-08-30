// WidgetPickerModal — lists the built-in widget types AND saved widget
// templates (a user's own configured widgets); click either to add it to
// the currently active dashboard, then close. Templates can be exported/
// imported as .widget.json files right from here.
//
// A dialog rather than a floating panel: unlike Layouts/Data Sources/Notes
// (persistent tools you dip in and out of alongside your work), this is a
// one-shot "pick something and go" action with no reason to stay pinned
// open on the canvas — every existing floating panel in this app is the
// former, which made a panel here the wrong fit despite matching the
// pattern superficially.
//
// Owned by DashboardShell (open/close state, not registered in
// panels.config.jsx / PanelHost), so it's scoped to whichever dashboard is
// actually on screen rather than the global panel layer.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal } from '../components/ui'
import useAppStore from '../store/useAppStore'
import WIDGET_TYPES from './widgets.config'
import {
  listWidgetTemplates, deleteWidgetTemplate, exportWidgetTemplate,
  importWidgetTemplateFromFile, instantiateWidgetTemplate,
} from './widgetTemplates'
import {
  IconFileImport, IconDownload, IconTrash,
} from '@tabler/icons-react'

export default function WidgetPickerModal({ open, onClose, dashboard, onAddWidget }) {
  const addToast = useAppStore((s) => s.addToast)
  const [templates, setTemplates] = useState([])
  const [importing, setImporting] = useState(false)
  const importRef = useRef(null)

  const refresh = useCallback(() => listWidgetTemplates().then(setTemplates), [])
  useEffect(() => { if (open) refresh() }, [open, refresh])

  const handleAddType = (type) => {
    onAddWidget({ type: type.id })
    addToast({ type: 'success', message: `${type.title} added to "${dashboard.name}"` })
    onClose()
  }

  const handleAddTemplate = async (template) => {
    try {
      const { widgetData, rehydratedCount } = await instantiateWidgetTemplate(template)
      onAddWidget(widgetData)
      addToast({
        type: 'success',
        message: rehydratedCount > 0
          ? `"${template.name}" added — embedded dataset restored`
          : `"${template.name}" added to "${dashboard.name}"`,
      })
      onClose()
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
    <Modal open={open} onClose={onClose} title="Add Widget" width={480}>
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
                tabIndex={0}
                onClick={() => handleAddTemplate(tpl)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
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
    </Modal>
  )
}
