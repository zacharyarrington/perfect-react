import { useState, useMemo } from 'react'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import useGisWorker from '../gis/useGisWorker'
import EmbeddedWorkflowCanvas from '../workflow/EmbeddedWorkflowCanvas'
import {
  IconCircle, IconBolt, IconScissors, IconLink, IconStack,
  IconVectorTriangle, IconShape, IconGridDots, IconTarget,
  IconArrowsJoin2, IconMapPin, IconChartBar, IconTool,
  IconRuler, IconRuler2,
  IconPoint, IconLine, IconPolygon, IconRoute,
} from '@tabler/icons-react'

// geomTypes: 'point' | 'line' | 'polygon' | 'any' | 'point+polygon' | 'line+polygon'
const TOOLS = [
  {
    key: 'buffer',
    icon: <IconCircle size={20} />,
    label: 'Buffer',
    desc: 'Expand or shrink features by a fixed distance',
    detail: 'Creates a new polygon layer where each feature is expanded (positive distance) or shrunk (negative distance) by the specified amount. Useful for proximity analysis — e.g. "all areas within 1 km of a road."',
    geometry: 'Any geometry (points, lines, or polygons)',
    geomTypes: ['point', 'line', 'polygon'],
    output: 'Polygon layer',
  },
  {
    key: 'intersect',
    icon: <IconBolt size={20} />,
    label: 'Intersect',
    desc: 'Keep only the areas where two layers overlap',
    detail: 'Clips the active layer to the extent of a second polygon layer, keeping only features or portions that fall inside both. Attributes from both layers are preserved in the result.',
    geometry: 'Polygon (both layers)',
    geomTypes: ['polygon'],
    output: 'Polygon layer',
  },
  {
    key: 'difference',
    icon: <IconScissors size={20} />,
    label: 'Difference',
    desc: 'Cut one layer out of another (cookie-cutter)',
    detail: 'Subtracts the shape of a second layer from the active layer. Anything that overlaps the second layer is removed. Think of it as a cookie-cutter — the second layer is the cutter.',
    geometry: 'Polygon (both layers)',
    geomTypes: ['polygon'],
    output: 'Polygon layer',
  },
  {
    key: 'union',
    icon: <IconLink size={20} />,
    label: 'Union',
    desc: 'Merge all features in a layer into a single shape',
    detail: 'Combines every feature in the active layer into one unified polygon, dissolving all internal boundaries. Useful for creating a single outline of a dataset.',
    geometry: 'Polygon',
    geomTypes: ['polygon'],
    output: 'Single polygon feature',
  },
  {
    key: 'dissolve',
    icon: <IconStack size={20} />,
    label: 'Dissolve',
    desc: 'Merge features that share the same field value',
    detail: 'Groups features by a chosen attribute field and merges those with identical values into single shapes. For example, dissolving US counties by "STATE" produces one polygon per state.',
    geometry: 'Polygon',
    geomTypes: ['polygon'],
    output: 'Polygon layer (one feature per unique value)',
  },
  {
    key: 'simplify',
    icon: <IconVectorTriangle size={20} />,
    label: 'Simplify',
    desc: 'Reduce vertex count to make geometries lighter',
    detail: 'Removes unnecessary vertices using the Douglas-Peucker algorithm. Higher tolerance = more simplification. Useful for improving render performance on dense or detailed geometries.',
    geometry: 'Lines or polygons',
    geomTypes: ['line', 'polygon'],
    output: 'Simplified copy of the active layer',
  },
  {
    key: 'hull',
    icon: <IconShape size={20} />,
    label: 'Convex Hull',
    desc: 'Draw the tightest convex polygon around all features',
    detail: 'Creates a single convex polygon that fully encloses all features in the layer — like stretching a rubber band around all the points. Useful for bounding-area estimates.',
    geometry: 'Any geometry',
    geomTypes: ['point', 'line', 'polygon'],
    output: 'Single polygon',
  },
  {
    key: 'voronoi',
    icon: <IconGridDots size={20} />,
    label: 'Voronoi',
    desc: 'Partition space into regions nearest to each point',
    detail: 'Divides the map into polygon regions where every location is assigned to its nearest input point. Commonly used for service-area analysis, e.g. "which hospital is closest to this location?"',
    geometry: 'Points only',
    geomTypes: ['point'],
    output: 'Polygon layer (one region per input point)',
  },
  {
    key: 'centroids',
    icon: <IconTarget size={20} />,
    label: 'Centroids',
    desc: 'Place a point at the center of each feature',
    detail: 'Calculates the geometric centroid (center of mass) of each feature and returns them as a point layer. Useful for labeling polygons or converting polygons to points for further analysis.',
    geometry: 'Lines or polygons',
    geomTypes: ['line', 'polygon'],
    output: 'Point layer',
  },
  {
    key: 'spatial_join',
    icon: <IconArrowsJoin2 size={20} />,
    label: 'Spatial Join',
    desc: 'Copy polygon attributes onto points that fall inside',
    detail: 'For each point in the points layer, finds which polygon it falls inside and copies that polygon\'s attributes onto the point. Points outside all polygons are excluded from the result.',
    geometry: 'Points layer + polygon layer',
    geomTypes: ['point', 'polygon'],
    output: 'Point layer with joined attributes',
  },
  {
    key: 'nearest',
    icon: <IconMapPin size={20} />,
    label: 'Nearest Neighbor',
    desc: 'Find each feature\'s closest match in another layer',
    detail: 'For each feature in the active layer, finds the nearest feature in a target layer and adds a "nearest_distance" attribute with the distance in kilometers. Useful for proximity tagging.',
    geometry: 'Points (active layer), any geometry (target)',
    geomTypes: ['point'],
    output: 'Point layer with distance attribute',
  },
  {
    key: 'stats',
    icon: <IconChartBar size={20} />,
    label: 'Field Stats',
    desc: 'Calculate summary statistics for a numeric field',
    detail: 'Computes count, sum, mean, median, min, max, and standard deviation for any numeric attribute field in the active layer. Results are shown inline — no new layer is created.',
    geometry: 'Any geometry (needs numeric attribute)',
    geomTypes: ['point', 'line', 'polygon'],
    output: 'Statistics summary (no new layer)',
  },
]

function GeomIcons({ types }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginTop: 4, justifyContent: 'center' }}>
      {types.includes('point')   && <IconPoint   size={10} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />}
      {types.includes('line')    && <IconLine     size={10} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />}
      {types.includes('polygon') && <IconPolygon  size={10} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />}
    </div>
  )
}

export default function GisToolsPanel() {
  const { layers, activeLayerId, addLayer, addToast, setLoading, measureMode, setMeasureMode, addGisLogEntry, openPanel } = useAppStore()
  const { runOperation } = useGisWorker()
  const [tab, setTab] = useState('tools')  // 'tools' | 'workflow'
  const [activeTool, setActiveTool] = useState(null)
  const [params, setParams] = useState({})
  const [stats, setStats] = useState(null)

  const polyLayers  = useMemo(() => layers.filter((l) => l.type === 'polygon' || l.type === 'mixed'), [layers])
  const pointLayers = useMemo(() => layers.filter((l) => l.type === 'point' || l.type === 'mixed'), [layers])
  const allFields   = useMemo(() => {
    const layer = layers.find((l) => l.id === activeLayerId)
    if (!layer?.geojson?.features?.length) return []
    const keys = new Set()
    for (const f of layer.geojson.features) Object.keys(f.properties || {}).forEach((k) => keys.add(k))
    return [...keys]
  }, [layers, activeLayerId])

  const set = (k, v) => setParams((p) => ({ ...p, [k]: v }))
  const activeLayer = layers.find((l) => l.id === activeLayerId)

  const toolLabel = TOOLS.find((t) => t.key === activeTool)?.label ?? activeTool

  const run = async () => {
    if (!activeLayer) {
      addToast({ type: 'error', message: 'No active layer selected — choose a layer from the dropdown before running a tool.', duration: 10000 })
      return
    }
    setLoading(true, `Running ${toolLabel}…`)
    setStats(null)

    // Validate inputs on the main thread before sending to worker
    let payload = null
    let name    = ''

    try {
      switch (activeTool) {
        case 'buffer': {
          const dist  = Number(params.distance || 1)
          const units = params.units || 'kilometers'
          payload = { geojson: activeLayer.geojson, distance: dist, units }
          name    = `${activeLayer.name} — Buffer ${dist} ${units}`
          break
        }
        case 'intersect': {
          const otherLayer = layers.find((l) => l.id === params.layer2)
          if (!otherLayer) throw new Error('No second layer selected — choose a polygon layer to intersect with.')
          payload = { fc1: activeLayer.geojson, fc2: otherLayer.geojson }
          name    = `${activeLayer.name} ∩ ${otherLayer.name}`
          break
        }
        case 'difference': {
          const otherLayer = layers.find((l) => l.id === params.layer2)
          if (!otherLayer) throw new Error('No second layer selected — choose a polygon layer to subtract.')
          payload = { fc1: activeLayer.geojson, fc2: otherLayer.geojson }
          name    = `${activeLayer.name} − ${otherLayer.name}`
          break
        }
        case 'union': {
          payload = { geojson: activeLayer.geojson }
          name    = `${activeLayer.name} — Union`
          break
        }
        case 'dissolve': {
          if (!params.field) throw new Error('No field selected — choose an attribute field to dissolve by.')
          payload = { geojson: activeLayer.geojson, field: params.field }
          name    = `${activeLayer.name} — Dissolved by ${params.field}`
          break
        }
        case 'simplify': {
          payload = { geojson: activeLayer.geojson, tolerance: Number(params.tolerance || 0.01) }
          name    = `${activeLayer.name} — Simplified`
          break
        }
        case 'hull': {
          payload = { geojson: activeLayer.geojson }
          name    = `${activeLayer.name} — Convex Hull`
          break
        }
        case 'voronoi': {
          payload = { geojson: activeLayer.geojson }
          name    = `${activeLayer.name} — Voronoi`
          break
        }
        case 'centroids': {
          payload = { geojson: activeLayer.geojson }
          name    = `${activeLayer.name} — Centroids`
          break
        }
        case 'spatial_join': {
          const pts  = pointLayers.find((l) => l.id === (params.pointLayer || activeLayerId))
          const poly = layers.find((l) => l.id === params.polyLayer)
          if (!pts)  throw new Error('No points layer selected — choose a layer containing point features.')
          if (!poly) throw new Error('No polygon layer selected — choose a layer containing polygon features.')
          payload = { points: pts.geojson, polygons: poly.geojson }
          name    = `${pts.name} in ${poly.name}`
          break
        }
        case 'nearest': {
          const target = layers.find((l) => l.id === params.targetLayer)
          if (!target) throw new Error('No target layer selected — choose a layer to find nearest features in.')
          payload = { sourceFC: activeLayer.geojson, targetFC: target.geojson }
          name    = `${activeLayer.name} — Nearest in ${target.name}`
          break
        }
        case 'stats': {
          if (!params.field) throw new Error('No field selected — choose a numeric attribute field.')
          payload = { geojson: activeLayer.geojson, field: params.field }
          break
        }
        default:
          throw new Error(`Unknown tool: ${activeTool}`)
      }
    } catch (err) {
      // Input validation errors — no need to hit the worker
      addGisLogEntry({ tool: toolLabel, status: 'error', message: err.message })
      addToast({ type: 'error', message: err.message, duration: 10000,
        action: { label: 'View Log', onClick: () => openPanel('gislog') } })
      setLoading(false)
      return
    }

    try {
      const result = await runOperation(activeTool, payload)

      if (activeTool === 'stats') {
        if (!result) throw new Error(`Field "${params.field}" has no numeric values — stats require at least one number in the selected field.`)
        setStats(result)
        addGisLogEntry({ tool: toolLabel, status: 'success', message: `Field stats for "${params.field}" on "${activeLayer.name}"` })
        return
      }

      if (!result) throw new Error('Operation returned no result — the geometry may be invalid or degenerate.')
      const featureCount = result.features?.length ?? 0
      addLayer({ name, type: 'mixed', geojson: result })
      addGisLogEntry({ tool: toolLabel, status: 'success', message: `Created "${name}" (${featureCount} feature${featureCount !== 1 ? 's' : ''})` })
      addToast({ type: 'success', message: `Created layer: ${name}` })
    } catch (err) {
      addGisLogEntry({ tool: toolLabel, status: 'error', message: err.message })
      addToast({ type: 'error', message: err.message, duration: 10000,
        action: { label: 'View Log', onClick: () => openPanel('gislog') } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <FloatingPanel
      panelKey="gistools"
      title="GIS Tools"
      icon={<IconTool size={16} />}
      defaultWidth={tab === 'workflow' ? 520 : 300}
      defaultHeight={tab === 'workflow' ? 560 : 500}
    >
      {/* ── Tab switcher ── */}
      <div className="panel-tabs">
        <button
          className={`panel-tab${tab === 'tools' ? ' panel-tab-active' : ''}`}
          onClick={() => setTab('tools')}
        >
          <IconTool size={13} /> Tools
        </button>
        <button
          className={`panel-tab${tab === 'workflow' ? ' panel-tab-active' : ''}`}
          onClick={() => setTab('workflow')}
        >
          <IconRoute size={13} /> Workflow
        </button>
      </div>

      {/* ── Workflow tab ── */}
      {tab === 'workflow' && <EmbeddedWorkflowCanvas />}

      {/* ── Tools tab ── */}
      {tab === 'tools' && (!activeTool ? (
        <>
          {/* Active layer */}
          <div className="panel-section">
            <div className="section-label">Active Layer</div>
            <select className="select" value={activeLayerId || ''} onChange={(e) => useAppStore.getState().setActiveLayer(e.target.value)}>
              <option value="">— Select layer —</option>
              {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* General Tools */}
          <div className="panel-section" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Measure Tools</div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>or right-click map</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-ghost${measureMode === 'distance' ? ' active' : ''}`}
                style={{ flex: 1, fontSize: 12, gap: 6 }}
                onClick={() => setMeasureMode(measureMode === 'distance' ? null : 'distance')}
              >
                <IconRuler size={14} /> Distance
              </button>
              <button
                className={`btn btn-ghost${measureMode === 'area' ? ' active' : ''}`}
                style={{ flex: 1, fontSize: 12, gap: 6 }}
                onClick={() => setMeasureMode(measureMode === 'area' ? null : 'area')}
              >
                <IconRuler2 size={14} /> Area
              </button>
            </div>
          </div>

          {/* GIS Tools */}
          <div className="section-label" style={{ padding: '8px 12px 4px', borderTop: '1px solid var(--border-subtle)' }}>GIS Tools</div>
          <div className="tool-grid">
            {TOOLS.map((t) => (
              <div
                key={t.key}
                className="tool-card"
                title={t.desc}
                onClick={() => { setActiveTool(t.key); setParams({}); setStats(null) }}
              >
                <div className="tool-card-icon">{t.icon}</div>
                <div className="tool-card-name">{t.label}</div>
                <div className="tool-card-desc">{t.desc}</div>
                {t.geomTypes && <GeomIcons types={t.geomTypes} className="tool-card-geom-icons" />}
              </div>
            ))}
          </div>

        </>
      ) : (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-xs" onClick={() => { setActiveTool(null); setStats(null) }}>← Back</button>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14 }}>
              {TOOLS.find((t) => t.key === activeTool)?.icon}
              {TOOLS.find((t) => t.key === activeTool)?.label}
            </span>
          </div>

          {/* Info card */}
          {(() => {
            const tool = TOOLS.find((t) => t.key === activeTool)
            if (!tool) return null
            return (
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {tool.detail}
                </p>
                <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, minWidth: 72 }}>Requires</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{tool.geometry}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, minWidth: 72 }}>Output</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{tool.output}</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Tool-specific params */}
          {activeTool === 'buffer' && (
            <>
              <div className="form-row">
                <label className="label">Distance</label>
                <input className="input" type="number" min={0} step={0.1} value={params.distance || 1}
                  onChange={(e) => set('distance', e.target.value)} />
              </div>
              <div className="form-row">
                <label className="label">Units</label>
                <select className="select" value={params.units || 'kilometers'} onChange={(e) => set('units', e.target.value)}>
                  <option value="kilometers">Kilometers</option>
                  <option value="miles">Miles</option>
                  <option value="meters">Meters</option>
                  <option value="feet">Feet</option>
                </select>
              </div>
            </>
          )}

          {(activeTool === 'intersect' || activeTool === 'difference') && (
            <div className="form-row">
              <label className="label">Second Layer</label>
              <select className="select" value={params.layer2 || ''} onChange={(e) => set('layer2', e.target.value)}>
                <option value="">— Select —</option>
                {layers.filter((l) => l.id !== activeLayerId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}

          {activeTool === 'dissolve' && (
            <div className="form-row">
              <label className="label">Dissolve by Field</label>
              <select className="select" value={params.field || ''} onChange={(e) => set('field', e.target.value)}>
                <option value="">— Select field —</option>
                {allFields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}

          {activeTool === 'simplify' && (
            <div className="form-row">
              <label className="label">Tolerance (degrees): {params.tolerance || 0.01}</label>
              <input type="range" className="slider" min={0.0001} max={0.5} step={0.001} value={params.tolerance || 0.01}
                onChange={(e) => set('tolerance', e.target.value)} />
            </div>
          )}

          {activeTool === 'spatial_join' && (
            <>
              <div className="form-row">
                <label className="label">Points Layer</label>
                <select className="select" value={params.pointLayer || ''} onChange={(e) => set('pointLayer', e.target.value)}>
                  <option value="">— Select —</option>
                  {pointLayers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="label">Polygons Layer</label>
                <select className="select" value={params.polyLayer || ''} onChange={(e) => set('polyLayer', e.target.value)}>
                  <option value="">— Select —</option>
                  {polyLayers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </>
          )}

          {activeTool === 'nearest' && (
            <div className="form-row">
              <label className="label">Target Layer</label>
              <select className="select" value={params.targetLayer || ''} onChange={(e) => set('targetLayer', e.target.value)}>
                <option value="">— Select —</option>
                {layers.filter((l) => l.id !== activeLayerId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}

          {activeTool === 'stats' && (
            <div className="form-row">
              <label className="label">Field</label>
              <select className="select" value={params.field || ''} onChange={(e) => set('field', e.target.value)}>
                <option value="">— Select field —</option>
                {allFields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}

          {stats && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ color: 'var(--accent-primary)' }}>{typeof v === 'number' ? v.toFixed(4) : v}</span>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary" onClick={run}>Run {TOOLS.find((t) => t.key === activeTool)?.label}</button>
        </div>
      ))}
    </FloatingPanel>
  )
}

