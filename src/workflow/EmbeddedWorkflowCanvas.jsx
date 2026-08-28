import { useState, useRef, useEffect } from 'react'
import useAppStore from '../store/useAppStore'
import {
  TRANSFORMER_DEFS, TRANSFORMER_CATEGORIES,
  executeLinearWorkflow, resolveStepFields,
} from './transformerEngine'
import {
  IconX, IconChevronDown, IconChevronRight,
  IconPlayerPlay, IconTrash, IconPlus,
  IconAlertTriangle, IconCircleCheck, IconLoader,
  IconArrowUp, IconArrowDown, IconSearch,
} from '@tabler/icons-react'

// ── Field select: dropdown of upstream fields + free-type fallback ────────────
function FieldSelect({ value, fields, onChange, optional, placeholder }) {
  const [freeType, setFreeType] = useState(false)

  if (!fields.length || freeType) {
    return (
      <div className="ewf-field-combo">
        <input className="ewf-input" type="text" value={value ?? ''}
          placeholder={placeholder || 'Field name…'}
          onChange={e => onChange(e.target.value)} />
        {freeType && (
          <button className="ewf-combo-toggle" title="Back to list" onClick={() => setFreeType(false)}>▾</button>
        )}
      </div>
    )
  }
  return (
    <div className="ewf-field-combo">
      <select className="ewf-select" value={value ?? ''} onChange={e => onChange(e.target.value)}>
        {optional ? <option value="">— none —</option> : <option value="">— select —</option>}
        {fields.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <button className="ewf-combo-toggle" title="Type custom name" onClick={() => setFreeType(true)}>✎</button>
    </div>
  )
}

// ── Field multi-select: scrollable checkbox list ──────────────────────────────
function FieldMultiSelect({ value, fields, onChange }) {
  const selected = new Set((value || '').split(',').map(s => s.trim()).filter(Boolean))
  const toggle = f => {
    const next = new Set(selected)
    next.has(f) ? next.delete(f) : next.add(f)
    onChange([...next].join(', '))
  }
  if (!fields.length) {
    return <input className="ewf-input" type="text" value={value ?? ''}
      placeholder="field1, field2…" onChange={e => onChange(e.target.value)} />
  }
  return (
    <div className="ewf-field-multi">
      {fields.map(f => (
        <label key={f} className={`ewf-field-multi-item${selected.has(f) ? ' ewf-field-multi-on' : ''}`}>
          <input type="checkbox" checked={selected.has(f)} onChange={() => toggle(f)} />
          <span>{f}</span>
        </label>
      ))}
    </div>
  )
}

// ── Param editor ──────────────────────────────────────────────────────────────
function ParamEditor({ def, step, layers, stepIdx, steps, onChange }) {
  const { all, numeric } = resolveStepFields(stepIdx, steps, layers)

  return (
    <div className="ewf-params">
      {def.params.map(p => {
        const val = step.params?.[p.key] ?? p.default ?? ''
        return (
          <div key={p.key} className="ewf-param-row">
            <label className="ewf-param-label" title={p.label}>
              {p.label}
              {['field','field-optional','field-numeric','field-numeric-optional','field-or-new'].includes(p.type) && all.length > 0 && (
                <span className="ewf-ctx-dot" title={`${all.length} fields from upstream layer`} />
              )}
            </label>

            {p.type === 'layer' ? (
              <select className="ewf-select" value={val} onChange={e => onChange(p.key, e.target.value)}>
                <option value="">— select layer —</option>
                {layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            ) : p.type === 'field' ? (
              <FieldSelect value={val} fields={all} onChange={v => onChange(p.key, v)} />
            ) : p.type === 'field-optional' ? (
              <FieldSelect value={val} fields={all} optional onChange={v => onChange(p.key, v)} placeholder="— none —" />
            ) : p.type === 'field-numeric' ? (
              <FieldSelect value={val} fields={numeric} onChange={v => onChange(p.key, v)} placeholder="Numeric field…" />
            ) : p.type === 'field-numeric-optional' ? (
              <FieldSelect value={val} fields={numeric} optional onChange={v => onChange(p.key, v)} placeholder="— use fixed —" />
            ) : p.type === 'field-or-new' ? (
              <FieldSelect value={val} fields={all} optional onChange={v => onChange(p.key, v)} placeholder="New field name…" />
            ) : p.type === 'field-multi' ? (
              <FieldMultiSelect value={val} fields={all} onChange={v => onChange(p.key, v)} />
            ) : p.type === 'select' ? (
              <select className="ewf-select" value={val} onChange={e => onChange(p.key, e.target.value)}>
                {p.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : p.type === 'boolean' ? (
              <label className="ewf-checkbox-row">
                <input type="checkbox" checked={Boolean(val)} onChange={e => onChange(p.key, e.target.checked)} />
                <span>Enabled</span>
              </label>
            ) : p.type === 'number' ? (
              <input className="ewf-input" type="number" value={val} onChange={e => onChange(p.key, e.target.value)} />
            ) : (
              <input className="ewf-input" type="text" value={val}
                placeholder={p.hint || p.label} onChange={e => onChange(p.key, e.target.value)} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ step, def, stepIdx, totalSteps, steps, layers, onRemove, onMove, onParamChange, isRunning }) {
  const [collapsed, setCollapsed] = useState(false)

  const canMoveUp   = stepIdx > 0
  const canMoveDown = stepIdx < totalSteps - 1

  return (
    <div className="ewf-step">
      {/* Connector line above (except first step) */}
      {stepIdx > 0 && (
        <div className="ewf-step-connector">
          <div className="ewf-step-connector-line" />
          <div className="ewf-step-connector-arrow" />
        </div>
      )}

      <div className={`ewf-step-card${isRunning ? ' ewf-step-running' : ''}`}
        style={{ '--nc': def.color }}>
        {/* Card header */}
        <div className="ewf-step-header">
          <div className="ewf-step-badge">{stepIdx + 1}</div>
          <span className="ewf-step-icon">{def.icon}</span>
          <span className="ewf-step-title">{def.label}</span>
          <div className="ewf-step-actions">
            <button className="ewf-step-btn" onClick={() => onMove(step.id, -1)} disabled={!canMoveUp} title="Move up">
              <IconArrowUp size={11} />
            </button>
            <button className="ewf-step-btn" onClick={() => onMove(step.id, 1)} disabled={!canMoveDown} title="Move down">
              <IconArrowDown size={11} />
            </button>
            <button className="ewf-step-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
              {collapsed ? <IconChevronRight size={11} /> : <IconChevronDown size={11} />}
            </button>
            <button className="ewf-step-btn ewf-step-btn-rm" onClick={() => onRemove(step.id)} title="Remove step">
              <IconX size={11} />
            </button>
          </div>
        </div>

        {/* Params */}
        {!collapsed && def.params.length > 0 && (
          <ParamEditor def={def} step={step} layers={layers}
            stepIdx={stepIdx} steps={steps}
            onChange={(key, val) => onParamChange(step.id, key, val)} />
        )}

        {/* No-param indicator */}
        {!collapsed && def.params.length === 0 && (
          <div className="ewf-step-no-params">No configuration needed</div>
        )}
      </div>
    </div>
  )
}

// ── Add step picker ───────────────────────────────────────────────────────────
function AddStepPicker({ onAdd, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const lower = query.toLowerCase()
  const filtered = Object.entries(TRANSFORMER_DEFS).filter(([, d]) =>
    !query || d.label.toLowerCase().includes(lower) || d.category.toLowerCase().includes(lower)
  )
  const grouped = TRANSFORMER_CATEGORIES.map(cat => ({
    cat,
    items: filtered.filter(([, d]) => d.category === cat),
  })).filter(g => g.items.length)

  return (
    <div className="ewf-picker">
      <div className="ewf-picker-search">
        <IconSearch size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input ref={inputRef} className="ewf-picker-input" placeholder="Search transformers…"
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'Enter' && filtered.length === 1) { onAdd(filtered[0][0]); onClose() }
          }} />
        <button className="ewf-step-btn" onClick={onClose} title="Cancel"><IconX size={12} /></button>
      </div>
      <div className="ewf-picker-list">
        {grouped.map(({ cat, items }) => (
          <div key={cat}>
            <div className="ewf-picker-cat">{cat}</div>
            {items.map(([type, def]) => (
              <button key={type} className="ewf-picker-item"
                style={{ '--sc': def.color }}
                onClick={() => { onAdd(type); onClose() }}>
                <span className="ewf-picker-icon">{def.icon}</span>
                <div className="ewf-picker-info">
                  <span className="ewf-picker-name">{def.label}</span>
                </div>
              </button>
            ))}
          </div>
        ))}
        {!grouped.length && (
          <div className="ewf-picker-empty">No transformers match "{query}"</div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmbeddedWorkflowCanvas() {
  const {
    layers, workflowSteps,
    addWorkflowStep, updateWorkflowStep, removeWorkflowStep,
    moveWorkflowStep, clearWorkflow,
    addLayer, addToast,
  } = useAppStore()

  const [showPicker, setShowPicker]   = useState(false)
  const [runState,   setRunState]     = useState('idle')
  const [runLog,     setRunLog]       = useState([])
  const bottomRef = useRef(null)

  const handleParamChange = (id, key, val) => {
    const step = workflowSteps.find(s => s.id === id)
    if (!step) return
    updateWorkflowStep(id, { params: { ...step.params, [key]: val } })
  }

  const handleRun = async () => {
    setRunState('running'); setRunLog([])
    await new Promise(r => setTimeout(r, 40))
    try {
      const results = executeLinearWorkflow(workflowSteps, layers)
      const log = []
      for (const { label, geojson } of results) {
        const count = geojson?.features?.length ?? 0
        addLayer({ name: label, geojson, type: inferType(geojson) })
        log.push({ ok: true, msg: `"${label}" — ${count.toLocaleString()} feature${count !== 1 ? 's' : ''}` })
        addToast({ type: 'success', message: `Workflow: "${label}" added to map` })
      }
      setRunLog(log); setRunState('success')
    } catch (e) {
      setRunLog([{ ok: false, msg: e.message }])
      setRunState('error')
      addToast({ type: 'error', message: `Workflow failed: ${e.message}` })
    }
  }

  const handleClear = () => {
    if (workflowSteps.length === 0 || window.confirm('Clear all workflow steps?')) {
      clearWorkflow(); setRunState('idle'); setRunLog([])
    }
  }

  const handleAdd = (type) => {
    addWorkflowStep({ type })
    // Scroll to bottom after add
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <div className="ewf-linear-root">
      {/* ── Top action bar ── */}
      <div className="ewf-linear-bar">
        <span className="ewf-node-count">
          {workflowSteps.length > 0 ? `${workflowSteps.length} step${workflowSteps.length !== 1 ? 's' : ''}` : 'No steps'}
        </span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button className="ewf-run-btn" onClick={handleRun}
            disabled={runState === 'running' || workflowSteps.length === 0}>
            {runState === 'running'
              ? <><IconLoader size={13} className="ewf-spin" /> Running…</>
              : <><IconPlayerPlay size={13} /> Run</>}
          </button>
          <button className="ewf-clear-btn" onClick={handleClear}
            disabled={workflowSteps.length === 0} title="Clear all steps">
            <IconTrash size={13} />
          </button>
        </div>
      </div>

      {/* ── Run log ── */}
      {runLog.length > 0 && (
        <div className="ewf-log">
          {runLog.map((e, i) => (
            <div key={i} className={`ewf-log-entry${e.ok ? ' ewf-log-ok' : ' ewf-log-err'}`}>
              {e.ok ? <IconCircleCheck size={11} /> : <IconAlertTriangle size={11} />}
              <span>{e.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Step list ── */}
      <div className="ewf-linear-steps">
        {workflowSteps.length === 0 && !showPicker ? (
          <div className="ewf-linear-empty">
            <div className="ewf-empty-icon">⚡</div>
            <div className="ewf-empty-title">No steps yet</div>
            <div className="ewf-empty-desc">
              Add a <strong>Layer Reader</strong> first,<br />
              then chain transformers below it
            </div>
          </div>
        ) : (
          workflowSteps.map((step, idx) => {
            const def = TRANSFORMER_DEFS[step.type]
            if (!def) return null
            return (
              <StepCard
                key={step.id}
                step={step}
                def={def}
                stepIdx={idx}
                totalSteps={workflowSteps.length}
                steps={workflowSteps}
                layers={layers}
                onRemove={removeWorkflowStep}
                onMove={moveWorkflowStep}
                onParamChange={handleParamChange}
                isRunning={runState === 'running'}
              />
            )
          })
        )}

        {/* Add step picker (inline at bottom of list) */}
        {showPicker && (
          <div className="ewf-picker-wrapper">
            {workflowSteps.length > 0 && (
              <div className="ewf-step-connector">
                <div className="ewf-step-connector-line" />
                <div className="ewf-step-connector-arrow" />
              </div>
            )}
            <AddStepPicker onAdd={handleAdd} onClose={() => setShowPicker(false)} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Add step button (fixed at bottom) ── */}
      {!showPicker && (
        <div className="ewf-linear-add">
          <button className="ewf-add-btn" onClick={() => setShowPicker(true)}>
            <IconPlus size={14} /> Add Step
          </button>
        </div>
      )}
    </div>
  )
}

function inferType(geojson) {
  const types = new Set((geojson?.features || []).map(f => {
    const t = f.geometry?.type || ''
    if (t.includes('Point')) return 'point'
    if (t.includes('Line')) return 'line'
    if (t.includes('Polygon')) return 'polygon'
    return 'mixed'
  }))
  return types.size === 1 ? [...types][0] : 'mixed'
}
