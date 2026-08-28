import { useRef } from 'react'
import useAppStore from '../store/useAppStore'
import { KML_ICON_PRESETS, interpolateFields } from '../export/exportManager'
import TemplateControls from './TemplateControls'
import { extractKmlTemplate } from '../storage/styleTemplates'
import { IconMapPin, IconLine, IconPolygon } from '@tabler/icons-react'

// Reusable KML export settings form backed by kmlExportSettings in the store.
// fieldOptions: [{ value, label }] from the calling context (may be empty for bulk).
// features: the layer's raw feature list, used to preview {field} tokens and
// to pick which feature's attributes fill them in.
export default function KmlSettingsForm({ fieldOptions = [], features = [] }) {
  const { kmlExportSettings, setKmlExportSettings } = useAppStore()
  const set = (k, v) => setKmlExportSettings({ [k]: v })

  const nameRef = useRef(null)
  const folderRef = useRef(null)
  const descRef = useRef(null)

  const attributeFields = fieldOptions.filter((o) => o.value !== 'auto' && o.value !== 'none')
  const usesTokens = /\{[^{}]+\}/.test(
    `${kmlExportSettings.documentName}${kmlExportSettings.folderName}${kmlExportSettings.documentDescription}`
  )
  const sampleIndex = Math.min(kmlExportSettings.sampleFeatureIndex || 0, Math.max(features.length - 1, 0))
  const sampleProperties = features[sampleIndex]?.properties || {}

  // Insert {field} at the cursor position of whichever input last had focus
  // (falls back to appending at the end).
  const insertToken = (key, ref, field) => {
    const el = ref.current
    const current = kmlExportSettings[key] || ''
    const token = `{${field}}`
    if (el && document.activeElement === el && el.selectionStart != null) {
      const start = el.selectionStart
      const end = el.selectionEnd
      const next = current.slice(0, start) + token + current.slice(end)
      set(key, next)
      requestAnimationFrame(() => {
        el.focus()
        el.selectionStart = el.selectionEnd = start + token.length
      })
    } else {
      set(key, current + token)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <TemplateControls
          kind="kml"
          currentData={extractKmlTemplate(kmlExportSettings)}
          onApply={(data) => setKmlExportSettings(data)}
          label="KML Template"
        />
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', marginTop: 4 }}>Document Metadata</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -4 }}>
        Use <code>{'{fieldName}'}</code> in any field below to pull in a feature's attribute value.
      </div>

      {attributeFields.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {attributeFields.map((f) => (
            <button
              key={f.value}
              type="button"
              className="btn btn-ghost btn-xs"
              data-tooltip={`Insert into last-focused field`}
              onClick={() => {
                // Insert into whichever metadata field the user focused last;
                // default to Document Name if none has focus yet.
                if (document.activeElement === folderRef.current) insertToken('folderName', folderRef, f.value)
                else if (document.activeElement === descRef.current) insertToken('documentDescription', descRef, f.value)
                else insertToken('documentName', nameRef, f.value)
              }}
            >
              + {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="form-row">
        <label className="label">Document Name</label>
        <input
          ref={nameRef}
          className="input input-sm"
          placeholder="Layer name"
          value={kmlExportSettings.documentName}
          onChange={(e) => set('documentName', e.target.value)}
        />
      </div>
      <div className="form-row">
        <label className="label">Folder Name</label>
        <input
          ref={folderRef}
          className="input input-sm"
          placeholder="Layer name"
          value={kmlExportSettings.folderName}
          onChange={(e) => set('folderName', e.target.value)}
        />
      </div>
      <div className="form-row">
        <label className="label">Document Description</label>
        <textarea
          ref={descRef}
          className="input"
          rows={2}
          placeholder="Optional KML document description…"
          value={kmlExportSettings.documentDescription}
          onChange={(e) => set('documentDescription', e.target.value)}
          style={{ resize: 'vertical', minHeight: 56 }}
        />
      </div>

      {usesTokens && features.length > 0 && (
        <div className="form-row">
          <label className="label">Attribute values come from</label>
          <select
            className="select"
            value={sampleIndex}
            onChange={(e) => set('sampleFeatureIndex', Number(e.target.value))}
          >
            {features.map((f, i) => (
              <option key={i} value={i}>
                Feature {i + 1}{f.properties?.name ? ` — ${f.properties.name}` : ''}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Preview: <strong style={{ color: 'var(--text-primary)' }}>
              {interpolateFields(kmlExportSettings.documentName, sampleProperties) || '(empty)'}
            </strong>
          </div>
        </div>
      )}

      {fieldOptions.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', marginTop: 4 }}>Feature Labels</div>
          <div className="form-row">
            <label className="label">Placemark Name</label>
            <select className="select" value={kmlExportSettings.featureNameField} onChange={(e) => set('featureNameField', e.target.value)}>
              {fieldOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label className="label">Placemark Description</label>
            <select className="select" value={kmlExportSettings.featureDescriptionField} onChange={(e) => set('featureDescriptionField', e.target.value)}>
              {fieldOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </>
      )}

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', marginTop: 4 }}><IconMapPin size={13} /> Point Style</div>
      <div className="form-row">
        <label className="label">Preset Icon</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
          {KML_ICON_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className="btn btn-ghost"
              type="button"
              onClick={() => setKmlExportSettings({ iconPreset: preset.id, iconUrl: '' })}
              style={{
                justifyContent: 'flex-start',
                gap: 8,
                padding: '5px 8px',
                borderColor: kmlExportSettings.iconPreset === preset.id && !kmlExportSettings.iconUrl
                  ? 'var(--accent-primary)'
                  : 'var(--border-default)',
                background: kmlExportSettings.iconPreset === preset.id && !kmlExportSettings.iconUrl
                  ? 'rgba(0,212,200,0.08)'
                  : undefined,
              }}
            >
              <img src={preset.url} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
              <span style={{ fontSize: 11 }}>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="form-row-inline">
        <label className="label" style={{ flexShrink: 0 }}>Color</label>
        <input type="color" value={kmlExportSettings.pointColor} onChange={(e) => set('pointColor', e.target.value)}
          style={{ width: 36, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
        <label className="label" style={{ marginLeft: 8, flexShrink: 0 }}>Scale</label>
        <input type="range" className="slider" min={0.2} max={3} step={0.1} value={kmlExportSettings.pointScale}
          onChange={(e) => set('pointScale', Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 28 }}>{kmlExportSettings.pointScale}×</span>
      </div>
      <div className="form-row-inline">
        <label className="label" style={{ flexShrink: 0 }}>Label</label>
        <input type="range" className="slider" min={0} max={2} step={0.1} value={kmlExportSettings.labelScale}
          onChange={(e) => set('labelScale', Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 28 }}>{kmlExportSettings.labelScale}×</span>
      </div>
      <div className="form-row">
        <label className="label">Custom Icon URL</label>
        <input className="input input-sm" placeholder="https://…icon.png" value={kmlExportSettings.iconUrl}
          onChange={(e) => setKmlExportSettings({ iconUrl: e.target.value, iconPreset: kmlExportSettings.iconPreset })} />
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', marginTop: 4 }}><IconLine size={13} /> Line Style</div>
      <div className="form-row-inline">
        <label className="label" style={{ flexShrink: 0 }}>Color</label>
        <input type="color" value={kmlExportSettings.lineColor} onChange={(e) => set('lineColor', e.target.value)}
          style={{ width: 36, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
        <label className="label" style={{ marginLeft: 8, flexShrink: 0 }}>Width</label>
        <input type="range" className="slider" min={1} max={10} value={kmlExportSettings.lineWidth}
          onChange={(e) => set('lineWidth', Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 28 }}>{kmlExportSettings.lineWidth}px</span>
      </div>
      <div className="form-row-inline">
        <label className="label" style={{ flexShrink: 0 }}>Opacity</label>
        <input type="range" className="slider" min={0} max={1} step={0.05} value={kmlExportSettings.lineOpacity}
          onChange={(e) => set('lineOpacity', Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 28 }}>{Math.round(kmlExportSettings.lineOpacity * 100)}%</span>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', marginTop: 4 }}><IconPolygon size={13} /> Polygon Style</div>
      <div className="form-row-inline">
        <label className="label" style={{ flexShrink: 0 }}>Fill</label>
        <input type="color" value={kmlExportSettings.fillColor} onChange={(e) => set('fillColor', e.target.value)}
          style={{ width: 36, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
        <label className="label" style={{ marginLeft: 8, flexShrink: 0 }}>Opacity</label>
        <input type="range" className="slider" min={0} max={1} step={0.05} value={kmlExportSettings.fillOpacity}
          onChange={(e) => set('fillOpacity', Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 28 }}>{Math.round(kmlExportSettings.fillOpacity * 100)}%</span>
      </div>
      <div className="form-row-inline">
        <label className="label" style={{ flexShrink: 0 }}>Stroke</label>
        <input type="color" value={kmlExportSettings.strokeColor} onChange={(e) => set('strokeColor', e.target.value)}
          style={{ width: 36, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
        <label className="label" style={{ marginLeft: 8, flexShrink: 0 }}>Width</label>
        <input type="range" className="slider" min={0} max={8} value={kmlExportSettings.strokeWidth}
          onChange={(e) => set('strokeWidth', Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 28 }}>{kmlExportSettings.strokeWidth}px</span>
      </div>
      <div className="form-row-inline">
        <label className="label" style={{ flexShrink: 0 }}>Stroke Opacity</label>
        <input type="range" className="slider" min={0} max={1} step={0.05} value={kmlExportSettings.strokeOpacity}
          onChange={(e) => set('strokeOpacity', Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 28 }}>{Math.round(kmlExportSettings.strokeOpacity * 100)}%</span>
      </div>

      <div className="form-row">
        <label className="label">Altitude Mode</label>
        <select className="select" value={kmlExportSettings.altitudeMode} onChange={(e) => set('altitudeMode', e.target.value)}>
          <option value="clampToGround">Clamp to Ground</option>
          <option value="relativeToGround">Relative to Ground</option>
          <option value="absolute">Absolute</option>
        </select>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', marginTop: 4 }}>KML Options</div>
      {[
        { key: 'visibility',  label: 'Visible on open' },
        { key: 'open',        label: 'Open folder in viewer' },
        { key: 'tessellate',  label: 'Tessellate lines/polygons' },
        { key: 'extrude',     label: 'Extrude geometry' },
      ].map(({ key, label }) => (
        <label key={key} className="form-row-inline" style={{ justifyContent: 'space-between', gap: 12 }}>
          <span className="label" style={{ marginBottom: 0 }}>{label}</span>
          <input type="checkbox" checked={kmlExportSettings[key]} onChange={(e) => set(key, e.target.checked)} />
        </label>
      ))}
    </div>
  )
}
