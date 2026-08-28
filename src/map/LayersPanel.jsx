// LayersPanel — floating panel for managing map layers: visibility, color,
// opacity, labels, ordering, GeoJSON import, and zoom-to-layer.

import { useRef, useState } from 'react'
import FloatingPanel from '../panels/FloatingPanel'
import useAppStore from '../store/useAppStore'
import useMapStore from './useMapStore'
import { SAMPLE_CITIES, SAMPLE_ROUTE, SAMPLE_REGION } from './sampleData'
import {
  IconStack2, IconEye, IconEyeOff, IconTrash, IconZoomIn,
  IconChevronUp, IconChevronDown, IconUpload, IconSparkles,
} from '@tabler/icons-react'

import { detectGeomType, computeBounds } from './geojsonUtils'

const LAYER_COLORS = ['#00d4c8', '#0099ff', '#7c3aed', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#f97316']

export default function LayersPanel() {
  const addToast = useAppStore((s) => s.addToast)
  const {
    layers, activeLayerId, setActiveLayer,
    addLayer, removeLayer, updateLayer, updateLayerStyle,
    reorderLayers, setPendingFitBounds,
  } = useMapStore()
  const fileRef = useRef(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const nextColor = () => LAYER_COLORS[layers.length % LAYER_COLORS.length]

  const handleImport = async (file) => {
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const geojson = json.type === 'FeatureCollection' ? json
        : json.type === 'Feature' ? { type: 'FeatureCollection', features: [json] }
        : null
      if (!geojson) throw new Error('Not a GeoJSON Feature or FeatureCollection')
      addLayer({
        name: file.name.replace(/\.(geo)?json$/i, ''),
        type: detectGeomType(geojson),
        geojson,
        style: { color: nextColor() },
      })
      const bounds = computeBounds(geojson)
      if (bounds) setPendingFitBounds(bounds)
      addToast({ type: 'success', message: `Imported ${geojson.features.length} feature(s)` })
    } catch (e) {
      addToast({ type: 'error', message: `Import failed: ${e.message}` })
    }
    fileRef.current.value = ''
  }

  const handleLoadSamples = () => {
    addLayer({ name: 'Region',  type: 'polygon', geojson: SAMPLE_REGION, style: { color: '#7c3aed' } })
    addLayer({ name: 'Route',   type: 'line',    geojson: SAMPLE_ROUTE,  style: { color: '#0099ff', lineWidth: 3 } })
    addLayer({ name: 'Cities',  type: 'point',   geojson: SAMPLE_CITIES, style: { color: '#00d4c8', labelField: 'name' } })
    addToast({ type: 'success', message: 'Sample layers loaded' })
  }

  const handleZoomTo = (layer) => {
    const bounds = computeBounds(layer.geojson)
    if (bounds) setPendingFitBounds(bounds)
  }

  const commitRename = (id) => {
    if (renameValue.trim()) updateLayer(id, { name: renameValue.trim() })
    setRenamingId(null)
  }

  const activeLayer = layers.find((l) => l.id === activeLayerId)
  const fieldOptions = activeLayer?.geojson?.features?.[0]?.properties
    ? Object.keys(activeLayer.geojson.features[0].properties)
    : []

  return (
    <FloatingPanel
      panelKey="layers"
      title="Layers"
      icon={<IconStack2 size={16} />}
      defaultWidth={300}
      defaultHeight={440}
    >
      {/* Actions */}
      <div className="panel-section" style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => fileRef.current?.click()}>
          <IconUpload size={14} /> GeoJSON
        </button>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={handleLoadSamples}>
          <IconSparkles size={14} /> Samples
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.geojson,application/json"
          style={{ display: 'none' }}
          onChange={(e) => handleImport(e.target.files?.[0])}
        />
      </div>

      {/* Layer list — first item renders on top of the map */}
      {layers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconStack2 size={30} /></div>
          <div className="empty-state-title">No layers</div>
          <div className="empty-state-desc">Import a GeoJSON file or load the samples.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[...layers].reverse().map((layer) => {
            const idx = layers.indexOf(layer)
            const isActive = layer.id === activeLayerId
            return (
              <div key={layer.id}>
                <div
                  className={`map-layer-item${isActive ? ' active' : ''}`}
                  onClick={() => setActiveLayer(layer.id)}
                >
                  <button
                    className="panel-control-btn"
                    title={layer.visible !== false ? 'Hide layer' : 'Show layer'}
                    onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: layer.visible === false }) }}
                  >
                    {layer.visible !== false ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                  </button>

                  <label
                    className="map-layer-swatch"
                    style={{ background: layer.style?.color || '#888' }}
                    title="Layer color"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="color"
                      value={layer.style?.color || '#00d4c8'}
                      onChange={(e) => updateLayerStyle(layer.id, { color: e.target.value })}
                      style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                    />
                  </label>

                  {renamingId === layer.id ? (
                    <input
                      className="input input-sm"
                      style={{ flex: 1, minWidth: 0 }}
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(layer.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(layer.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="map-layer-name"
                      onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(layer.id); setRenameValue(layer.name) }}
                      title={`${layer.name} — double-click to rename`}
                    >
                      {layer.name}
                    </span>
                  )}

                  <span className="map-layer-count">{layer.geojson?.features?.length ?? 0}</span>

                  <button
                    className="panel-control-btn"
                    title="Move up (renders above)"
                    disabled={idx === layers.length - 1}
                    style={{ opacity: idx === layers.length - 1 ? 0.25 : 1 }}
                    onClick={(e) => { e.stopPropagation(); reorderLayers(idx, idx + 1) }}
                  >
                    <IconChevronUp size={13} />
                  </button>
                  <button
                    className="panel-control-btn"
                    title="Move down"
                    disabled={idx === 0}
                    style={{ opacity: idx === 0 ? 0.25 : 1 }}
                    onClick={(e) => { e.stopPropagation(); reorderLayers(idx, idx - 1) }}
                  >
                    <IconChevronDown size={13} />
                  </button>
                </div>

                {/* Expanded controls for the active layer */}
                {isActive && (
                  <div className="map-layer-details">
                    <div className="form-row-inline" style={{ marginBottom: 8 }}>
                      <span className="label" style={{ margin: 0, width: 52 }}>Opacity</span>
                      <input
                        type="range"
                        className="slider"
                        min={0} max={1} step={0.05}
                        value={layer.opacity ?? 1}
                        onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                      />
                    </div>
                    {fieldOptions.length > 0 && (
                      <div className="form-row-inline" style={{ marginBottom: 8 }}>
                        <span className="label" style={{ margin: 0, width: 52 }}>Label</span>
                        <select
                          className="select input-sm"
                          value={layer.style?.labelField || ''}
                          onChange={(e) => updateLayerStyle(layer.id, { labelField: e.target.value || null })}
                        >
                          <option value="">None</option>
                          {fieldOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-xs" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleZoomTo(layer)}>
                        <IconZoomIn size={12} /> Zoom to
                      </button>
                      <button
                        className="btn btn-danger btn-xs"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => { removeLayer(layer.id); addToast({ type: 'info', message: `Removed "${layer.name}"` }) }}
                      >
                        <IconTrash size={12} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </FloatingPanel>
  )
}
