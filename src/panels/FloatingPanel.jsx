import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Draggable from 'react-draggable'
import { ResizableBox } from 'react-resizable'
import useAppStore from '../store/useAppStore'
import { useDockSlot } from './DockSlots'
import PanelChrome from './PanelChrome'
import { isDockable } from '../config/panels.config'
import {
  IconChevronDown, IconChevronUp, IconX, IconLayoutSidebarRight, IconArrowsMaximize,
} from '@tabler/icons-react'

const MOBILE_QUERY = '(max-width: 768px)'

// Every panel component (NotesPanel, SettingsPanel, ...) renders its content
// inside <FloatingPanel panelKey title icon>...</FloatingPanel> and never
// needs to know whether it ends up floating or docked — this component picks
// the chrome. Docked: PanelChrome is portaled into the Dock's slot for this
// key (see DockSlots.jsx). Floating: the original Draggable/ResizableBox path.
export default function FloatingPanel({
  panelKey,
  title,
  icon,
  children,
  defaultWidth,
  defaultHeight,
  minWidth = 220,
  minHeight = 100,
  className = '',
}) {
  const panel           = useAppStore((s) => s.panels[panelKey])
  const setPanelPos     = useAppStore((s) => s.setPanelPosition)
  const setPanelSize    = useAppStore((s) => s.setPanelSize)
  const closePanel      = useAppStore((s) => s.closePanel)
  const bringToFront    = useAppStore((s) => s.bringPanelToFront)
  const panelZOrder     = useAppStore((s) => s.panelZOrder)
  const dockPanel       = useAppStore((s) => s.dockPanel)
  const undockPanel     = useAppStore((s) => s.undockPanel)
  const closeDockedPanel = useAppStore((s) => s.closeDockedPanel)

  const [minimized, setMinimized] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia?.(MOBILE_QUERY).matches ?? false
  )
  // Local pos drives Draggable smoothly; syncs from store on external changes (reset/clamp)
  const [pos, setPos] = useState({ x: panel?.x ?? 12, y: panel?.y ?? 70 })
  const nodeRef = useRef(null)
  const dockSlot = useDockSlot(panelKey)

  // Keep pos in sync when the store changes outside of a drag (clamp or reset)
  useEffect(() => {
    setPos({ x: panel?.x ?? 12, y: panel?.y ?? 70 })
  }, [panel?.x, panel?.y])

  // Docking is a desktop affordance — on narrow viewports every panel falls
  // through to the floating/bottom-sheet path regardless of its docked flag,
  // so we don't migrate state (and risk it flickering) across the breakpoint.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (!panel?.open) return null

  const docked = panel.docked && !isMobile

  if (docked) {
    if (!dockSlot) return null // dock rail not mounted / this tab not active yet
    return createPortal(
      <PanelChrome
        title={title}
        icon={icon}
        minimized={minimized}
        dragHandleClassName="dock-panel-drag-handle"
        controls={
          <>
            <button
              className="panel-control-btn"
              onClick={() => setMinimized((m) => !m)}
              title={minimized ? 'Restore' : 'Minimize'}
            >
              {minimized ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </button>
            <button
              className="panel-control-btn"
              onClick={() => undockPanel(panelKey)}
              title="Pop out"
            >
              <IconArrowsMaximize size={14} />
            </button>
            <button
              className="panel-control-btn close"
              onClick={() => closeDockedPanel(panelKey)}
              title="Close"
            >
              <IconX size={14} />
            </button>
          </>
        }
      >
        {children}
      </PanelChrome>,
      dockSlot
    )
  }

  const zIndex = 100 + panelZOrder.indexOf(panelKey)
  const w = panel.w || defaultWidth || 300
  const h = panel.h || defaultHeight || 400

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".panel-drag-handle"
      position={pos}
      bounds="parent"
      onDrag={(_, data) => setPos({ x: data.x, y: data.y })}
      onStop={(_, data) => {
        setPos({ x: data.x, y: data.y })
        setPanelPos(panelKey, data.x, data.y)
      }}
      onStart={() => bringToFront(panelKey)}
    >
      <div
        ref={nodeRef}
        style={{ position: 'absolute', zIndex, top: 0, left: 0 }}
        onClick={() => bringToFront(panelKey)}
      >
        <ResizableBox
          width={w}
          height={minimized ? 42 : h}
          minConstraints={[minWidth, minimized ? 42 : minHeight]}
          maxConstraints={[800, 900]}
          onResizeStop={(_, data) => setPanelSize(panelKey, data.size.width, data.size.height)}
          resizeHandles={minimized ? [] : ['se']}
        >
          <div
            className={`floating-panel panel-enter ${minimized ? 'panel-minimized' : ''} ${className}`}
            data-panel-key={panelKey}
            style={{ width: '100%', height: '100%' }}
          >
            <PanelChrome
              title={title}
              icon={icon}
              minimized={minimized}
              controls={
                <>
                  <button
                    className="panel-control-btn"
                    onClick={() => setMinimized((m) => !m)}
                    title={minimized ? 'Restore' : 'Minimize'}
                  >
                    {minimized ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                  </button>
                  {isDockable(panelKey) && (
                    <button
                      className="panel-control-btn"
                      onClick={() => dockPanel(panelKey)}
                      title="Dock"
                    >
                      <IconLayoutSidebarRight size={14} />
                    </button>
                  )}
                  <button
                    className="panel-control-btn close"
                    onClick={() => closePanel(panelKey)}
                    title="Close"
                  >
                    <IconX size={14} />
                  </button>
                </>
              }
            >
              {children}
            </PanelChrome>
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  )
}
