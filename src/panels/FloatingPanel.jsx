import { useRef, useState, useEffect } from 'react'
import Draggable from 'react-draggable'
import { ResizableBox } from 'react-resizable'
import useAppStore from '../store/useAppStore'
import { IconChevronDown, IconChevronUp, IconX } from '@tabler/icons-react'

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

  const [minimized, setMinimized] = useState(false)
  // Local pos drives Draggable smoothly; syncs from store on external changes (reset/clamp)
  const [pos, setPos] = useState({ x: panel?.x ?? 12, y: panel?.y ?? 70 })
  const nodeRef = useRef(null)

  // Keep pos in sync when the store changes outside of a drag (clamp or reset)
  useEffect(() => {
    setPos({ x: panel?.x ?? 12, y: panel?.y ?? 70 })
  }, [panel?.x, panel?.y])

  if (!panel?.open) return null

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
            {/* Header */}
            <div className="panel-header">
              <div className="panel-drag-handle">
                {icon && <span className="panel-icon">{icon}</span>}
                <span className="panel-title">{title}</span>
              </div>
              <div className="panel-controls">
                <button
                  className="panel-control-btn"
                  onClick={() => setMinimized((m) => !m)}
                  title={minimized ? 'Restore' : 'Minimize'}
                >
                  {minimized ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                </button>
                <button
                  className="panel-control-btn close"
                  onClick={() => closePanel(panelKey)}
                  title="Close"
                >
                  <IconX size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            {!minimized && (
              <div className="panel-body">
                {children}
              </div>
            )}
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  )
}
