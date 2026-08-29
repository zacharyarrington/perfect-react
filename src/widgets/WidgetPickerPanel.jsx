// WidgetPickerPanel — lists the built-in widget types; click one to add it
// to the currently active dashboard. Saved widget templates (a user's own
// configured widgets, shareable as .widget.json files) land in a later
// stage and will appear here too, above the built-ins.
//
// Reads the active dashboard straight from useDashboardStore rather than
// via props, since floating panels are mounted globally by PanelHost and
// aren't scoped to whichever page happens to be showing.

import FloatingPanel from '../panels/FloatingPanel'
import useAppStore from '../store/useAppStore'
import useDashboardStore from '../dashboards/useDashboardStore'
import WIDGET_TYPES from './widgets.config'
import { IconApps } from '@tabler/icons-react'

export default function WidgetPickerPanel() {
  const addToast = useAppStore((s) => s.addToast)
  const { dashboards, activeDashboardId, addWidget } = useDashboardStore()
  const dashboard = dashboards.find((d) => d.id === activeDashboardId)

  const handleAdd = (type) => {
    if (!dashboard) {
      addToast({ type: 'warning', message: 'Open a dashboard first' })
      return
    }
    addWidget(dashboard.id, { type: type.id })
    addToast({ type: 'success', message: `${type.title} added to "${dashboard.name}"` })
  }

  return (
    <FloatingPanel
      panelKey="widgets"
      title="Add Widget"
      icon={<IconApps size={16} />}
      defaultWidth={300}
      defaultHeight={420}
    >
      <div className="panel-section">
        <div className="section-label">Widget types</div>
        <div className="widget-picker-list">
          {WIDGET_TYPES.map((type) => (
            <button
              key={type.id}
              className="widget-picker-item"
              onClick={() => handleAdd(type)}
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
