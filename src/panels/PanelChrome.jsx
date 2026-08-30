// PanelChrome — the header/body markup shared by a panel whether it's
// floating (inside FloatingPanel's Draggable/ResizableBox) or docked (portaled
// into a Dock tab slot). Purely presentational: no store reads, no
// positioning — just render it inside whichever wrapper the caller needs.
export default function PanelChrome({
  title,
  icon,
  controls,
  dragHandleClassName = 'panel-drag-handle',
  minimized = false,
  children,
}) {
  return (
    <>
      <div className="panel-header">
        <div className={dragHandleClassName}>
          {icon && <span className="panel-icon">{icon}</span>}
          <span className="panel-title">{title}</span>
        </div>
        <div className="panel-controls">{controls}</div>
      </div>
      {!minimized && (
        <div className="panel-body">
          {children}
        </div>
      )}
    </>
  )
}
