import { useMemo, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'

export default function LegendPanel() {
  const { layers } = useAppStore()
  const [collapsed, setCollapsed] = useState(false)

  const visibleLayers = useMemo(
    () => layers.filter((l) => l.visible && l.geojson?.features?.length > 0),
    [layers]
  )

  if (!visibleLayers.length) return null

  return (
    <div className="legend-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="legend-title" style={{ marginBottom: collapsed ? 0 : undefined }}>Legend</div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 0 0 8px', display: 'flex', alignItems: 'center' }}
          title={collapsed ? 'Expand legend' : 'Minimize legend'}
        >
          {collapsed ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
        </button>
      </div>
      {!collapsed && visibleLayers.map((layer) => {
        const style = layer.style || {}

        // Categorical legend
        if (style.symbologyMode === 'categorical' && style.categoricalValues?.length) {
          return (
            <div key={layer.id}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 4 }}>{layer.name}</div>
              {style.categoricalValues.slice(0, 8).map((cv, i) => (
                <div key={i} className="legend-item">
                  <div className="legend-swatch" style={{ background: cv.color }} />
                  <span>{cv.label}</span>
                </div>
              ))}
              {style.categoricalValues.length > 8 && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{style.categoricalValues.length - 8} more…</div>
              )}
            </div>
          )
        }

        // Graduated legend
        if (style.symbologyMode === 'graduated' && style.graduatedBreaks?.length) {
          return (
            <div key={layer.id}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 4 }}>{layer.name}</div>
              {style.graduatedBreaks.map((b, i) => (
                <div key={i} className="legend-item">
                  <div className="legend-swatch" style={{ background: b.color, borderRadius: 2 }} />
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
          )
        }

        // Simple legend
        return (
          <div key={layer.id} className="legend-item">
            <div className="legend-swatch" style={{
              background: style.color || '#888',
              borderRadius: layer.type === 'point' ? '50%' : 2,
              opacity: style.fillOpacity || 1,
            }} />
            <span style={{ fontWeight: 500 }}>{layer.name}</span>
            <span className="badge-teal" style={{ fontSize: 9, marginLeft: 'auto', padding: '1px 5px', borderRadius: 4, background: 'rgba(0,212,200,0.10)', color: 'var(--accent-primary)' }}>
              {layer.geojson?.features?.length || 0}
            </span>
          </div>
        )
      })}
    </div>
  )
}
