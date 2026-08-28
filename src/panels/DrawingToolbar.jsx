import useAppStore from '../store/useAppStore'
import { IconMapPin, IconLine, IconPolygon, IconX, IconPencil, IconCheck, IconTrash } from '@tabler/icons-react'

const MODE_LABEL = {
  draw_point:       { label: 'Point',   icon: <IconMapPin size={14} /> },
  draw_line_string: { label: 'Line',    icon: <IconLine size={14} /> },
  draw_polygon:     { label: 'Polygon', icon: <IconPolygon size={14} /> },
}

export default function DrawingToolbar() {
  const { drawMode, setDrawMode, layers, drawTargetLayerId, setDrawTargetLayer, editLayerId, setEditLayer } = useAppStore()

  // Edit mode banner
  if (editLayerId) {
    const editLayer = layers.find((l) => l.id === editLayerId)
    return (
      <div className="draw-toolbar">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
          <IconPencil size={14} /> Editing <strong style={{ color: 'var(--text-primary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editLayer?.name}</strong>
        </span>

        <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', margin: '0 4px' }} />

        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Click to select · Drag to move · Del to remove
        </span>

        <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', margin: '0 4px' }} />

        <button
          className="draw-tool-btn"
          data-tooltip="Done editing"
          style={{ color: 'var(--accent-primary)' }}
          onClick={() => setEditLayer(null)}
        >
          <IconCheck size={15} /> <span style={{ fontSize: 11, marginLeft: 2 }}>Done</span>
        </button>
      </div>
    )
  }

  if (!drawMode) return null

  const { label, icon } = MODE_LABEL[drawMode] || { label: drawMode, icon: null }

  return (
    <div className="draw-toolbar">
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
        {icon} Drawing {label}
      </span>

      <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', margin: '0 4px' }} />

      <select
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 6,
          color: 'var(--text-secondary)',
          fontSize: 11,
          padding: '2px 6px',
          maxWidth: 120,
        }}
        value={drawTargetLayerId || ''}
        onChange={(e) => setDrawTargetLayer(e.target.value || null)}
      >
        <option value="">New Layer</option>
        {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', margin: '0 4px' }} />

      <button
        className="draw-tool-btn"
        data-tooltip="Cancel drawing (Esc)"
        style={{ color: 'var(--accent-danger)' }}
        onClick={() => setDrawMode(null)}
      >
        <IconX size={15} />
      </button>
    </div>
  )
}
