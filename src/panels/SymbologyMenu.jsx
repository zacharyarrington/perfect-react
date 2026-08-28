import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import useAppStore from '../store/useAppStore'
import ColorPicker from '../components/ColorPicker'
import IconPicker from '../components/IconPicker'
import TemplateControls from '../components/TemplateControls'
import { IconX, IconCheck } from '@tabler/icons-react'
import { getUniqueValues, classifyQuantile, classifyEqualInterval } from '../gis/gisOperations'
import { extractStyleTemplate } from '../storage/styleTemplates'

const COLOR_RAMPS = {
  'teal-blue':  ['#00d4c8','#0099ff','#0077cc','#005599','#003366'],
  'warm':       ['#fef3c7','#fcd34d','#f97316','#ef4444','#7f1d1d'],
  'purple':     ['#ede9fe','#a78bfa','#7c3aed','#4c1d95','#1e1b4b'],
  'green-blue': ['#d1fae5','#34d399','#059669','#1d4ed8','#1e3a8a'],
  'heat':       ['#00d4c8','#22c55e','#f59e0b','#ef4444','#7c3aed'],
  'red-yellow': ['#fff7ed','#fed7aa','#fb923c','#dc2626','#7f1d1d'],
}

const RULE_OPS = ['=', '!=', '>', '>=', '<', '<=', 'contains']

const MENU_WIDTH = 320
const MENU_MAX_HEIGHT = 540

function computePos(anchorRect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = anchorRect.right + 8
  if (left + MENU_WIDTH > vw - 8) left = anchorRect.left - MENU_WIDTH - 8
  left = Math.max(8, left)
  let top = anchorRect.top
  if (top + MENU_MAX_HEIGHT > vh - 8) top = Math.max(8, vh - MENU_MAX_HEIGHT - 8)
  return { top, left }
}

// anchorRect is a plain { top, right, bottom, left } captured at click time
export default function SymbologyMenu({ layerId, anchorRect, onClose }) {
  const { layers, updateLayerStyle, addToast } = useAppStore()
  const layer = layers.find((l) => l.id === layerId)
  const style = layer?.style || {}

  const [tab, setTab] = useState(style.symbologyMode || 'simple')

  useEffect(() => {
    setTab(style.symbologyMode || 'simple')
  }, [layerId]) // eslint-disable-line

  if (!layer) return null

  const pos = computePos(anchorRect)
  const set = (updates) => updateLayerStyle(layer.id, updates)

  const fields = (() => {
    if (!layer?.geojson?.features?.length) return []
    const keys = new Set()
    for (const f of layer.geojson.features) Object.keys(f.properties || {}).forEach((k) => keys.add(k))
    return [...keys]
  })()

  const numericFields = fields.filter((f) => {
    const sample = layer?.geojson?.features?.[0]?.properties?.[f]
    return typeof sample === 'number' || !isNaN(Number(sample))
  })

  const applyGraduated = () => {
    if (!style.graduatedField) return
    const breaks = style.breakMethod === 'quantile'
      ? classifyQuantile(layer.geojson, style.graduatedField, style.numBreaks || 5)
      : classifyEqualInterval(layer.geojson, style.graduatedField, style.numBreaks || 5)
    const ramp = COLOR_RAMPS[style.colorRamp] || COLOR_RAMPS['teal-blue']
    const n = style.numBreaks || 5
    const gradBreaks = breaks.slice(0, -1).map((min, i) => ({
      min,
      max: breaks[i + 1],
      color: ramp[Math.min(i, ramp.length - 1)],
      label: `${Number(min).toFixed(2)} – ${Number(breaks[i + 1]).toFixed(2)}`,
    }))
    set({ graduatedBreaks: gradBreaks, symbologyMode: 'graduated' })
    addToast({ type: 'success', message: `Graduated symbology applied (${n} classes)` })
  }

  const applyCategorical = () => {
    if (!style.categoricalField) return
    const vals = getUniqueValues(layer.geojson, style.categoricalField)
    const ramp = COLOR_RAMPS[style.colorRamp] || COLOR_RAMPS['teal-blue']
    const catVals = vals.map((v, i) => ({
      value: v,
      color: ramp[i % ramp.length],
      label: String(v),
    }))
    set({ categoricalValues: catVals, symbologyMode: 'categorical' })
    addToast({ type: 'success', message: `Categorical: ${vals.length} classes` })
  }

  const addRule = () => {
    const rules = [...(style.rules || []), {
      id: Date.now(),
      label: `Rule ${(style.rules?.length || 0) + 1}`,
      filter: { field: fields[0] || '', operator: '=', value: '' },
      style: { color: '#00d4c8', radius: 6, lineWidth: 2, fillOpacity: 0.5 },
    }]
    set({ rules, symbologyMode: 'rule-based' })
  }

  const updateRule = (idx, updates) => {
    const rules = (style.rules || []).map((r, i) => i === idx ? { ...r, ...updates } : r)
    set({ rules })
  }
  const updateRuleStyle = (idx, styleUpdates) => {
    const rules = (style.rules || []).map((r, i) =>
      i === idx ? { ...r, style: { ...r.style, ...styleUpdates } } : r
    )
    set({ rules })
  }
  const updateRuleFilter = (idx, filterUpdates) => {
    const rules = (style.rules || []).map((r, i) =>
      i === idx ? { ...r, filter: { ...r.filter, ...filterUpdates } } : r
    )
    set({ rules })
  }
  const removeRule = (idx) => {
    set({ rules: (style.rules || []).filter((_, i) => i !== idx) })
  }

  return createPortal(
    <>
      {/* Transparent backdrop — click outside to dismiss */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1999 }}
        onClick={onClose}
      />

      {/* Menu card */}
      <div
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          width: MENU_WIDTH,
          maxHeight: MENU_MAX_HEIGHT,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px 8px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: style.color || '#888', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {layer.name}
          </span>
          <span className="badge badge-blue">{layer.type}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{layer.geojson?.features?.length || 0} feat.</span>
          <TemplateControls
            kind="style"
            currentData={extractStyleTemplate(style)}
            onApply={(data) => set(data)}
          />
          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Opacity */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <div className="opacity-row">
            <input
              type="range"
              className="slider"
              min={0} max={1} step={0.01}
              value={layer.opacity ?? 1}
              onChange={(e) => useAppStore.getState().updateLayer(layer.id, { opacity: Number(e.target.value) })}
            />
            <span className="opacity-value">{Math.round((layer.opacity ?? 1) * 100)}%</span>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="tabs" style={{ padding: '6px 12px', flexShrink: 0, display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)' }}>
          {['simple', 'categorical', 'graduated', 'rule-based'].map((t) => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`}
              onClick={() => { setTab(t); set({ symbologyMode: t }) }}>
              {t === 'simple' ? 'Simple' : t === 'categorical' ? 'Category' : t === 'graduated' ? 'Graduated' : 'Rules'}
            </button>
          ))}
        </div>

        {/* Content — scrollable */}
        <div style={{ flex: 1, overflow: 'auto' }}>

          {/* ── Simple ── */}
          {tab === 'simple' && (
            <div className="panel-section">
              <div className="form-row">
                <label className="label">Render Type</label>
                <select className="select" value={style.type || 'circle'} onChange={(e) => set({ type: e.target.value })}>
                  <option value="circle">Circle (Points)</option>
                  <option value="symbol">Symbol / Icon</option>
                  <option value="fill">Fill (Polygons)</option>
                  <option value="line">Line</option>
                </select>
              </div>

              <div className="form-row">
                <label className="label">Color</label>
                <ColorPicker value={style.color || '#00d4c8'} onChange={(c) => set({ color: c })} />
              </div>

              {(style.type === 'circle' || !style.type) && (
                <>
                  <div className="form-row">
                    <label className="label">Radius: {style.radius || 6}px</label>
                    <input type="range" className="slider" min={1} max={40}
                      value={style.radius || 6} onChange={(e) => set({ radius: Number(e.target.value) })} />
                  </div>
                  <div className="form-row">
                    <label className="label">Stroke Color</label>
                    <ColorPicker value={style.strokeColor || '#ffffff'} onChange={(c) => set({ strokeColor: c })} />
                  </div>
                  <div className="form-row">
                    <label className="label">Stroke Width: {style.strokeWidth ?? 1}px</label>
                    <input type="range" className="slider" min={0} max={8} step={0.5}
                      value={style.strokeWidth ?? 1} onChange={(e) => set({ strokeWidth: Number(e.target.value) })} />
                  </div>
                </>
              )}

              {style.type === 'symbol' && (
                <div className="form-row">
                  <label className="label">Icon</label>
                  <IconPicker value={style.iconType} onChange={(icon) => set({ iconType: icon })} />
                </div>
              )}

              {style.type === 'fill' && (
                <div className="form-row">
                  <label className="label">Fill Opacity: {Math.round((style.fillOpacity ?? 0.5) * 100)}%</label>
                  <input type="range" className="slider" min={0} max={1} step={0.05}
                    value={style.fillOpacity ?? 0.5}
                    onChange={(e) => set({ fillOpacity: Number(e.target.value) })} />
                </div>
              )}

              {style.type === 'line' && (
                <div className="form-row">
                  <label className="label">Line Width: {style.lineWidth || 2}px</label>
                  <input type="range" className="slider" min={1} max={20}
                    value={style.lineWidth || 2}
                    onChange={(e) => set({ lineWidth: Number(e.target.value) })} />
                </div>
              )}

              <div className="form-row">
                <label className="label">Label Field</label>
                <select className="select" value={style.labelField || ''} onChange={(e) => set({ labelField: e.target.value || null })}>
                  <option value="">— None —</option>
                  {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="form-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                <label className="label">Hover Popup Fields</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                  {fields.map((f) => {
                    const checked = (style.popupFields || []).includes(f)
                    return (
                      <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const current = style.popupFields || []
                            set({ popupFields: checked ? current.filter((x) => x !== f) : [...current, f] })
                          }}
                          style={{ accentColor: 'var(--accent-primary)', width: 14, height: 14 }}
                        />
                        {f}
                      </label>
                    )
                  })}
                  {fields.length === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No fields available</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Categorical ── */}
          {tab === 'categorical' && (
            <div className="panel-section">
              <div className="form-row">
                <label className="label">Classify by Field</label>
                <select className="select" value={style.categoricalField || ''}
                  onChange={(e) => set({ categoricalField: e.target.value })}>
                  <option value="">— Select field —</option>
                  {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="label">Color Ramp</label>
                <select className="select" value={style.colorRamp || 'teal-blue'}
                  onChange={(e) => set({ colorRamp: e.target.value })}>
                  {Object.keys(COLOR_RAMPS).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={applyCategorical}>
                Apply Categorical
              </button>
              {style.categoricalValues?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {style.categoricalValues.map((cv, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <ColorPicker value={cv.color} onChange={(c) => {
                        const vals = [...style.categoricalValues]
                        vals[i] = { ...cv, color: c }
                        set({ categoricalValues: vals })
                      }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{cv.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Graduated ── */}
          {tab === 'graduated' && (
            <div className="panel-section">
              <div className="form-row">
                <label className="label">Value Field</label>
                <select className="select" value={style.graduatedField || ''}
                  onChange={(e) => set({ graduatedField: e.target.value })}>
                  <option value="">— Select numeric field —</option>
                  {numericFields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="label">Classification Method</label>
                <select className="select" value={style.breakMethod || 'quantile'}
                  onChange={(e) => set({ breakMethod: e.target.value })}>
                  <option value="quantile">Quantile</option>
                  <option value="equalInterval">Equal Interval</option>
                </select>
              </div>
              <div className="form-row">
                <label className="label">Classes: {style.numBreaks || 5}</label>
                <input type="range" className="slider" min={2} max={10}
                  value={style.numBreaks || 5}
                  onChange={(e) => set({ numBreaks: Number(e.target.value) })} />
              </div>
              <div className="form-row">
                <label className="label">Color Ramp</label>
                <select className="select" value={style.colorRamp || 'teal-blue'}
                  onChange={(e) => set({ colorRamp: e.target.value })}>
                  {Object.keys(COLOR_RAMPS).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={applyGraduated}>
                Apply Graduated
              </button>
              {style.graduatedBreaks?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {style.graduatedBreaks.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <ColorPicker value={b.color} onChange={(c) => {
                        const breaks = [...style.graduatedBreaks]
                        breaks[i] = { ...b, color: c }
                        set({ graduatedBreaks: breaks })
                      }} />
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', flex: 1 }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Rule-based ── */}
          {tab === 'rule-based' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-section">
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  Rules are evaluated top-to-bottom. First matching rule wins.
                </p>
              </div>
              {(style.rules || []).map((rule, idx) => (
                <div key={rule.id} style={{
                  margin: '6px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <input className="input input-sm" style={{ flex: 1 }}
                      value={rule.label} onChange={(e) => updateRule(idx, { label: e.target.value })} />
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      onClick={() => removeRule(idx)}><IconX size={13} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <select className="select" style={{ flex: 2 }} value={rule.filter.field}
                      onChange={(e) => updateRuleFilter(idx, { field: e.target.value })}>
                      {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select className="select" style={{ flex: 1 }} value={rule.filter.operator}
                      onChange={(e) => updateRuleFilter(idx, { operator: e.target.value })}>
                      {RULE_OPS.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                    <input className="input input-sm" style={{ flex: 2 }}
                      placeholder="value" value={rule.filter.value}
                      onChange={(e) => updateRuleFilter(idx, { value: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ColorPicker value={rule.style.color} onChange={(c) => updateRuleStyle(idx, { color: c })} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>r:</span>
                    <input type="range" className="slider" min={2} max={20} style={{ flex: 1 }}
                      value={rule.style.radius || 6}
                      onChange={(e) => updateRuleStyle(idx, { radius: Number(e.target.value) })} />
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: 20 }}>
                      {rule.style.radius || 6}
                    </span>
                  </div>
                </div>
              ))}
              <div className="panel-section">
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={addRule}>＋ Add Rule</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — Save button */}
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
            <IconCheck size={14} /> Save
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
