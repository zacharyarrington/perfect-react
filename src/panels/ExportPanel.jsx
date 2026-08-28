import { useState, useEffect, useMemo } from 'react'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import { exportGeoJSON, exportCSV, exportExcel, exportKML, KML_ICON_PRESETS, interpolateFields } from '../export/exportManager'
import { applyFilters } from '../filters/FilterBuilder'
import { IconFileExport, IconMap, IconFile, IconFileSpreadsheet, IconMapPin } from '@tabler/icons-react'
import KmlSettingsForm from '../components/KmlSettingsForm'

export default function ExportPanel() {
  const {
    layers,
    activeLayerId,
    kmlExportSettings,
    addToast,
    openPanel,
    setActiveLayer,
  } = useAppStore()
  const [format, setFormat] = useState('geojson')
  const [layerId, setLayerId] = useState(activeLayerId || layers[0]?.id || '')
  const [showKmlSettings, setShowKmlSettings] = useState(false)
  const [exportScope, setExportScope] = useState('all')

  // Keep selected layer in sync with active layer when the panel opens or active layer changes
  useEffect(() => {
    if (activeLayerId) setLayerId(activeLayerId)
  }, [activeLayerId])

  const layer = layers.find((l) => l.id === layerId)
  const totalFeatureCount = layer?.geojson?.features?.length || 0
  const hasFilters = Boolean(layer?.filters?.length)
  const layerFields = useMemo(() => {
    if (!layer?.geojson?.features?.length) return []
    const fieldSet = new Set()
    for (const feature of layer.geojson.features) {
      Object.keys(feature.properties || {}).forEach((key) => fieldSet.add(key))
    }
    return Array.from(fieldSet).sort((a, b) => a.localeCompare(b))
  }, [layer])

  const fieldOptions = [
    { value: 'auto', label: 'Automatic' },
    { value: 'none', label: 'None' },
    ...layerFields.map((field) => ({ value: field, label: field })),
  ]

  const filteredGeojson = useMemo(() => {
    if (!layer?.geojson) return null
    return hasFilters ? applyFilters(layer.geojson, layer.filters) : layer.geojson
  }, [layer, hasFilters])

  const exportGeojson = useMemo(() => {
    if (!layer?.geojson) return null
    if (exportScope === 'filtered' && hasFilters) return filteredGeojson
    return layer.geojson
  }, [layer, exportScope, hasFilters, filteredGeojson])

  const exportFeatureCount = exportGeojson?.features?.length || 0
  const activeScopeLabel = exportScope === 'filtered' && hasFilters ? 'Filtered dataset' : 'Entire dataset'
  const exportLayer = useMemo(() => {
    if (!layer || !exportGeojson) return null
    return {
      ...layer,
      geojson: exportGeojson,
    }
  }, [layer, exportGeojson])

  const handleOpenFilters = () => {
    if (!layer) return
    setActiveLayer(layer.id)
    openPanel('filters')
  }

  const doExport = () => {
    if (!exportLayer) { addToast({ type: 'error', message: 'Select a layer to export' }); return }
    if (exportScope === 'filtered' && !hasFilters) {
      addToast({ type: 'error', message: 'No active filters found for this layer' })
      return
    }
    try {
      switch (format) {
        case 'geojson': exportGeoJSON(exportLayer); break
        case 'csv':     exportCSV(exportLayer); break
        case 'excel':   exportExcel(exportLayer); break
        case 'kml':     exportKML(exportLayer, kmlExportSettings); break
      }
      addToast({ type: 'success', message: `Exported ${exportLayer.name} as ${format.toUpperCase()} (${activeScopeLabel.toLowerCase()})` })
    } catch (err) {
      addToast({ type: 'error', message: `Export failed: ${err.message}` })
    }
  }

  return (
    <FloatingPanel panelKey="export" title="Export" icon={<IconFileExport size={16} />} defaultWidth={380} defaultHeight={680}>
      <div className="panel-section">
        <div className="form-row">
          <label className="label">Layer to Export</label>
          <select className="select" value={layerId} onChange={(e) => setLayerId(e.target.value)}>
            <option value="">— Select layer —</option>
            {layers.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.geojson?.features?.length || 0} features)</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label className="label">Export Format</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { id: 'geojson', label: <><IconMap size={13} /> GeoJSON</>,         desc: 'Standard vector format' },
              { id: 'csv',     label: <><IconFile size={13} /> CSV</>,             desc: 'Tabular with lat/lng' },
              { id: 'excel',   label: <><IconFileSpreadsheet size={13} /> Excel</>, desc: '.xlsx spreadsheet' },
              { id: 'kml',     label: <><IconMapPin size={13} /> KML</>,           desc: 'Google Earth format' },
            ].map((f) => (
              <div
                key={f.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${format === f.id ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  background: format === f.id ? 'rgba(0,212,200,0.08)' : 'var(--bg-elevated)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onClick={() => { setFormat(f.id); setShowKmlSettings(f.id === 'kml') }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: format === f.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{f.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <label className="label" style={{ marginBottom: 0 }}>Dataset Scope</label>
            <button className="btn btn-ghost btn-xs" type="button" onClick={handleOpenFilters} disabled={!layer}>
              Edit Filters
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setExportScope('all')}
              style={{
                borderColor: exportScope === 'all' ? 'var(--accent-primary)' : 'var(--border-default)',
                background: exportScope === 'all' ? 'rgba(0,212,200,0.08)' : 'var(--bg-elevated)',
                color: exportScope === 'all' ? 'var(--accent-primary)' : 'var(--text-primary)',
              }}
            >
              Entire dataset
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => hasFilters && setExportScope('filtered')}
              disabled={!hasFilters}
              style={{
                borderColor: exportScope === 'filtered' ? 'var(--accent-primary)' : 'var(--border-default)',
                background: exportScope === 'filtered' ? 'rgba(0,212,200,0.08)' : 'var(--bg-elevated)',
                color: exportScope === 'filtered' ? 'var(--accent-primary)' : 'var(--text-primary)',
                opacity: hasFilters ? 1 : 0.55,
              }}
            >
              Filtered only
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            {hasFilters
              ? `${filteredGeojson?.features?.length || 0} of ${totalFeatureCount} features match the active filters.`
              : 'No active filters on this layer. Use the Filters panel to export a subset.'}
          </div>
        </div>
      </div>

      {/* KML Settings */}
      {format === 'kml' && (
        <div className="panel-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="section-label" style={{ marginBottom: 0 }}>KML Style Settings</div>
            <button className="btn btn-ghost btn-xs" onClick={() => setShowKmlSettings((s) => !s)}>
              {showKmlSettings ? 'Hide' : 'Show'} Options
            </button>
          </div>
          {showKmlSettings && <KmlSettingsForm fieldOptions={fieldOptions} features={layer?.geojson?.features || []} />}
        </div>
      )}

      <div className="panel-section" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="section-label">Live Preview</div>
        <div style={{
          display: 'grid',
          gap: 8,
          padding: 12,
          border: '1px solid var(--border-default)',
          borderRadius: 10,
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Format</span>
            <strong style={{ color: 'var(--text-primary)' }}>{format.toUpperCase()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Scope</span>
            <strong style={{ color: 'var(--text-primary)' }}>{activeScopeLabel}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Features to export</span>
            <strong style={{ color: 'var(--text-primary)' }}>{exportFeatureCount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Fields available</span>
            <strong style={{ color: 'var(--text-primary)' }}>{layerFields.length}</strong>
          </div>

          {format === 'kml' && layer && (
            <>
              <div style={{ height: 1, background: 'var(--border-subtle)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Document name</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {interpolateFields(kmlExportSettings.documentName, layer.geojson?.features?.[kmlExportSettings.sampleFeatureIndex || 0]?.properties) || layer.name}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Placemark names</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {kmlExportSettings.featureNameField === 'auto'
                    ? 'Automatic'
                    : kmlExportSettings.featureNameField === 'none'
                      ? 'Generated defaults'
                      : kmlExportSettings.featureNameField}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Placemark descriptions</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {kmlExportSettings.featureDescriptionField === 'auto'
                    ? 'Automatic'
                    : kmlExportSettings.featureDescriptionField === 'none'
                      ? 'Disabled'
                      : kmlExportSettings.featureDescriptionField}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Point icon</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {kmlExportSettings.iconUrl
                    ? 'Custom URL'
                    : (KML_ICON_PRESETS.find((preset) => preset.id === kmlExportSettings.iconPreset)?.label || 'Yellow Dot')}
                </strong>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Export button */}
      <div className="panel-section" style={{ marginTop: 'auto' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: 14, fontWeight: 600 }}
          onClick={doExport}
          disabled={!layer || (exportScope === 'filtered' && !hasFilters)}
        >
          ⬇ Export {layer?.name || 'layer'} as {format.toUpperCase()}
        </button>
        {layer && (
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            {exportFeatureCount} feature{exportFeatureCount === 1 ? '' : 's'} · {layer.type} · {activeScopeLabel}
          </div>
        )}
      </div>
    </FloatingPanel>
  )
}
