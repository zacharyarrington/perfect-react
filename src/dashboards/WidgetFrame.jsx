// WidgetFrame — chrome around every widget on the canvas: drag handle,
// title, and a menu (settings/duplicate/save as template/export file/
// remove). The actual widget content is `children` — WidgetRenderer
// resolves the type, wraps it in an error boundary, and passes it in.
//
// The drag handle is a small area, not the whole card — react-grid-layout's
// dragConfig.handle selector (see DashboardCanvas.jsx) targets
// `.widget-drag-handle` specifically so clicking a chart legend, a table's
// sort header, or the menu button never starts a drag.

import { useEffect, useRef, useState } from 'react'
import {
  IconGripVertical, IconDots, IconSettings, IconCopy, IconTrash,
  IconDeviceFloppy, IconDownload,
} from '@tabler/icons-react'

export default function WidgetFrame({
  title, icon, onSettings, onDuplicate, onRemove, onSaveTemplate, onExport, children,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const item = (Icon, label, onClick, danger = false) => (
    <button
      className={`profile-dropdown-item${danger ? ' profile-dropdown-signout' : ''}`}
      onClick={() => { setMenuOpen(false); onClick() }}
    >
      <Icon size={14} /> {label}
    </button>
  )

  return (
    <div className="widget-frame">
      <div className="widget-frame-header widget-drag-handle">
        <IconGripVertical size={14} className="widget-drag-grip" />
        {icon && <span className="widget-frame-icon">{icon}</span>}
        <span className="widget-frame-title">{title}</span>
        <div className="widget-frame-actions widget-no-drag" ref={ref}>
          <button className="btn btn-icon btn-xs" onClick={() => setMenuOpen((o) => !o)} aria-label="Widget menu">
            <IconDots size={14} />
          </button>
          {menuOpen && (
            <div className="profile-dropdown widget-frame-menu">
              {onSettings && item(IconSettings, 'Settings', onSettings)}
              {onDuplicate && item(IconCopy, 'Duplicate', onDuplicate)}
              {onSaveTemplate && item(IconDeviceFloppy, 'Save as template', onSaveTemplate)}
              {onExport && item(IconDownload, 'Export file', onExport)}
              {onRemove && item(IconTrash, 'Remove', onRemove, true)}
            </div>
          )}
        </div>
      </div>
      <div className="widget-frame-body widget-no-drag">
        {children}
      </div>
    </div>
  )
}
