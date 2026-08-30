// Dock — the tabbed side rail: an alternate home for any dockable panel.
// A panel gets here via its "Dock" button (see FloatingPanel.jsx); this
// component only renders the tab strip and one slot per docked+open panel
// for FloatingPanel to portal its content into (see DockSlots.jsx). It never
// renders panel content itself, so it stays ignorant of what any panel is.
//
// Tab strip interactions (drag-to-reorder, hidden-scrollbar-with-
// scrollIntoView so an off-screen active tab stays reachable) mirror
// DashboardTabs.jsx's proven pattern, simplified: just switch + close, no
// rename/pin/menu.

import { useEffect, useRef, useState } from 'react'
import useAppStore from '../store/useAppStore'
import PANELS from '../config/panels.config'
import { registerDockSlot } from './DockSlots'
import { IconX, IconLayoutSidebarRightExpand, IconGripVertical } from '@tabler/icons-react'

export default function Dock() {
  const panels = useAppStore((s) => s.panels)
  const dock = useAppStore((s) => s.dock)
  const setDockActiveKey = useAppStore((s) => s.setDockActiveKey)
  const closeDockedPanel = useAppStore((s) => s.closeDockedPanel)
  const reorderDockTabs = useAppStore((s) => s.reorderDockTabs)
  const toggleDock = useAppStore((s) => s.toggleDock)
  const setDockWidth = useAppStore((s) => s.setDockWidth)

  const dragKeyRef = useRef(null)
  const activeTabRef = useRef(null)
  const resizingRef = useRef(null)
  const [resizing, setResizing] = useState(false)

  const dockedTabs = PANELS
    .filter((p) => panels[p.key]?.docked && panels[p.key]?.open)
    .sort((a, b) => (panels[a.key].dockOrder ?? 0) - (panels[b.key].dockOrder ?? 0))

  const activeKey = dockedTabs.some((p) => p.key === dock.activeKey)
    ? dock.activeKey
    : dockedTabs[0]?.key

  // Keep the active tab in view — the tab strip's scrollbar is hidden, so
  // without this a newly-docked or newly-activated tab off the visible edge
  // would be unreachable (same rationale as DashboardTabs.jsx).
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeKey])

  useEffect(() => {
    if (!activeKey || dock.activeKey === activeKey) return
    setDockActiveKey(activeKey)
  }, [activeKey, dock.activeKey, setDockActiveKey])

  useEffect(() => {
    if (!resizing) return
    const onMove = (e) => {
      const delta = resizingRef.current.startX - e.clientX
      setDockWidth(resizingRef.current.startWidth + delta)
    }
    const onUp = () => setResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing, setDockWidth])

  if (dockedTabs.length === 0) return null

  // Collapsed: a slim icon-only strip so docked panels stay discoverable
  // without permanently costing the full rail's width.
  if (!dock.open) {
    return (
      <div className="dock-rail-collapsed">
        {dockedTabs.map((p) => (
          <button
            key={p.key}
            className="dock-rail-collapsed-btn"
            onClick={toggleDock}
            data-tooltip={p.title}
          >
            {p.icon}
          </button>
        ))}
      </div>
    )
  }

  const handleDragStart = (key) => { dragKeyRef.current = key }
  const handleDrop = (key) => {
    const from = dragKeyRef.current
    if (from === null || from === key) return
    reorderDockTabs(from, key)
    dragKeyRef.current = null
  }

  const startResize = (e) => {
    resizingRef.current = { startX: e.clientX, startWidth: dock.width }
    setResizing(true)
  }

  return (
    <div className="dock-rail" style={{ width: dock.width }}>
      <div
        className="dock-resize-handle"
        onMouseDown={startResize}
        title="Drag to resize"
      >
        <IconGripVertical size={12} />
      </div>

      <div className="dock-header">
        <div className="dock-tab-scroll">
          {dockedTabs.map((p) => {
            const isActive = p.key === activeKey
            return (
              <div
                key={p.key}
                ref={isActive ? activeTabRef : null}
                className={`dock-tab${isActive ? ' active' : ''}`}
                draggable
                onDragStart={() => handleDragStart(p.key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(p.key)}
                onClick={() => setDockActiveKey(p.key)}
                title={p.title}
              >
                <span className="dock-tab-icon">{p.icon}</span>
                <span className="dock-tab-name">{p.title}</span>
                <button
                  className="dock-tab-close"
                  onClick={(e) => { e.stopPropagation(); closeDockedPanel(p.key) }}
                  title="Close"
                >
                  <IconX size={12} />
                </button>
              </div>
            )
          })}
        </div>
        <button
          className="dock-collapse-btn"
          onClick={toggleDock}
          title="Collapse dock"
        >
          <IconLayoutSidebarRightExpand size={16} />
        </button>
      </div>

      <div className="dock-body">
        {dockedTabs.map((p) => (
          <div
            key={p.key}
            className="dock-slot"
            data-panel-key={p.key}
            style={{ display: p.key === activeKey ? 'flex' : 'none' }}
            ref={(el) => registerDockSlot(p.key, el)}
          />
        ))}
      </div>
    </div>
  )
}
