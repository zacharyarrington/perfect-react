// WidgetFrame — chrome around every widget on the canvas: drag handle,
// title, and a menu (settings/duplicate/save as template/export file/
// remove). The actual widget content is `children` — WidgetRenderer
// resolves the type, wraps it in an error boundary, and passes it in.
//
// The header itself always renders, locked or not — only the grip and menu
// button inside it are conditionally hidden. Removing the whole header
// element on lock (an earlier version) changed the card's flex layout and
// made every widget visibly resize/slide on toggle; keeping the header
// mounted at a fixed height (see min-height on .widget-frame-header) keeps
// locked and unlocked geometry identical. The title stays in the header
// rather than moving to the body for the same reason it stays mounted at
// all — it's identity, not an editing affordance, so there's no reason to
// hide or relocate it just because the grip/menu have nothing to do while
// locked.
//
// The drag handle is a small area, not the whole card — react-grid-layout's
// dragConfig.handle selector (see DashboardCanvas.jsx) targets
// `.widget-drag-handle` specifically so clicking a chart legend, a table's
// sort header, or the menu button never starts a drag. That class is only
// applied when unlocked, so a locked header never presents as a drag target.

import { useEffect, useRef, useState } from 'react'
import {
  IconGripVertical, IconDots, IconSettings, IconCopy, IconTrash,
  IconDeviceFloppy, IconDownload,
} from '@tabler/icons-react'

export default function WidgetFrame({
  title, icon, locked, onSettings, onDuplicate, onRemove, onSaveTemplate, onExport, children,
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
    <div className={`widget-frame${locked ? ' widget-frame-locked' : ''}`}>
      {/* Always mounted, at a fixed height, so locking never changes the
          card's geometry — only its contents (grip, menu) are conditional.
          The drag-handle class itself is conditional too: it's what
          react-grid-layout grabs to start a drag, so a locked header must
          not carry it even though isDraggable={false} already blocks the
          drag at the library level (belt-and-suspenders: no stray "move"
          cursor / dead drag target left behind). */}
      <div className={`widget-frame-header${locked ? '' : ' widget-drag-handle'}`}>
        {!locked && <IconGripVertical size={14} className="widget-drag-grip" />}
        {icon && <span className="widget-frame-icon">{icon}</span>}
        <span className="widget-frame-title">{title}</span>
        {!locked && (
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
        )}
      </div>
      <div className="widget-frame-body widget-no-drag">
        {children}
      </div>
    </div>
  )
}
