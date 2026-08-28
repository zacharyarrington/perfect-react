import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import useAppStore from '../store/useAppStore'
import { TRANSFORMER_DEFS, TRANSFORMER_CATEGORIES, resolveUpstreamFields } from './transformerEngine'
import { IconX, IconChevronDown, IconChevronRight } from '@tabler/icons-react'

const NODE_WIDTH = 240

// Bezier SVG path between two points
function bezierPath(x1, y1, x2, y2) {
  const cx = Math.abs(x2 - x1) * 0.5 + Math.min(x1, x2) * 0
  const dx = Math.max(60, Math.abs(x2 - x1) * 0.5)
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
}

// ── Port dot — registers its DOM position via a ref callback ─────────────────
function PortDot({ side, isHighlight, onMouseDown, onMouseUp, portRef, title }) {
  return (
    <div
      ref={portRef}
      className={`wf-port-dot wf-port-${side}${isHighlight ? ' wf-port-highlight' : ''}`}
      onMouseDown={side === 'output' ? onMouseDown : undefined}
      onMouseUp={side === 'input' ? onMouseUp : undefined}
      title={title}
    />
  )
}

// ── FieldSelect — combobox with upstream field options + free-type fallback ──
function FieldSelect({ value, fields, onChange, placeholder, optional }) {
  const [freeType, setFreeType] = useState(false)

  // If there are no upstream fields yet, always show free-text
  if (!fields.length) {
    return (
      <input className="wf-param-input wf-param-no-context" type="text" value={value}
        placeholder={placeholder || 'Type field name…'}
        onChange={(e) => onChange(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()} />
    )
  }

  if (freeType) {
    return (
      <div className="wf-field-combo">
        <input className="wf-param-input" type="text" value={value} autoFocus
          placeholder="Type field name…"
          onChange={(e) => onChange(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()} />
        <button className="wf-field-combo-toggle" title="Back to list"
          onClick={() => setFreeType(false)} onMouseDown={(e) => e.stopPropagation()}>
          ▾
        </button>
      </div>
    )
  }

  return (
    <div className="wf-field-combo">
      <select className="wf-param-select" value={value}
        onChange={(e) => onChange(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()}>
        {optional && <option value="">— none —</option>}
        {!optional && <option value="">— select field —</option>}
        {fields.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      <button className="wf-field-combo-toggle" title="Type a custom name"
        onClick={() => setFreeType(true)} onMouseDown={(e) => e.stopPropagation()}>
        ✎
      </button>
    </div>
  )
}

// ── FieldMultiSelect — checkbox list for picking multiple fields ──────────────
function FieldMultiSelect({ value, fields, onChange }) {
  // value is comma-separated string
  const selected = new Set((value || '').split(',').map(s => s.trim()).filter(Boolean))

  const toggle = (f) => {
    const next = new Set(selected)
    next.has(f) ? next.delete(f) : next.add(f)
    onChange([...next].join(', '))
  }

  if (!fields.length) {
    return (
      <input className="wf-param-input wf-param-no-context" type="text" value={value}
        placeholder="field1, field2…"
        onChange={(e) => onChange(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()} />
    )
  }

  return (
    <div className="wf-field-multi" onMouseDown={(e) => e.stopPropagation()}>
      {fields.map((f) => (
        <label key={f} className={`wf-field-multi-item${selected.has(f) ? ' wf-field-multi-selected' : ''}`}>
          <input type="checkbox" checked={selected.has(f)} onChange={() => toggle(f)} />
          <span>{f}</span>
        </label>
      ))}
    </div>
  )
}

// ── ParamEditor ──────────────────────────────────────────────────────────────
function ParamEditor({ def, node, layers, onChange, upstreamFields }) {
  const { all: allFields, numeric: numericFields } = upstreamFields

  return (
    <div className="wf-node-params">
      {def.params.map((p) => {
        const val = node.params?.[p.key] ?? p.default ?? ''
        return (
          <div key={p.key} className="wf-param-row">
            <label className="wf-param-label" title={p.label}>
              {p.label}
              {/* Dot indicator when field context is available */}
              {(p.type === 'field' || p.type === 'field-numeric' || p.type === 'field-optional' || p.type === 'field-numeric-optional' || p.type === 'field-or-new') && allFields.length > 0 && (
                <span className="wf-field-ctx-dot" title={`${allFields.length} fields available`} />
              )}
            </label>

            {p.type === 'layer' ? (
              <select className="wf-param-select" value={val}
                onChange={(e) => onChange(p.key, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}>
                <option value="">— select layer —</option>
                {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

            ) : p.type === 'field' ? (
              <FieldSelect value={val} fields={allFields}
                onChange={(v) => onChange(p.key, v)} />

            ) : p.type === 'field-optional' ? (
              <FieldSelect value={val} fields={allFields} optional
                onChange={(v) => onChange(p.key, v)} placeholder="— none (process all) —" />

            ) : p.type === 'field-numeric' ? (
              <FieldSelect value={val} fields={numericFields}
                onChange={(v) => onChange(p.key, v)} placeholder="Select numeric field…" />

            ) : p.type === 'field-numeric-optional' ? (
              <FieldSelect value={val} fields={numericFields} optional
                onChange={(v) => onChange(p.key, v)} placeholder="— use fixed distance —" />

            ) : p.type === 'field-or-new' ? (
              <FieldSelect value={val} fields={allFields} optional
                onChange={(v) => onChange(p.key, v)} placeholder="New field name…" />

            ) : p.type === 'field-multi' ? (
              <FieldMultiSelect value={val} fields={allFields}
                onChange={(v) => onChange(p.key, v)} />

            ) : p.type === 'select' ? (
              <select className="wf-param-select" value={val}
                onChange={(e) => onChange(p.key, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}>
                {p.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>

            ) : p.type === 'boolean' ? (
              <label className="wf-param-checkbox-row">
                <input type="checkbox" checked={Boolean(val)}
                  onChange={(e) => onChange(p.key, e.target.checked)}
                  onMouseDown={(e) => e.stopPropagation()} />
                <span>Enabled</span>
              </label>

            ) : p.type === 'number' ? (
              <input className="wf-param-input" type="number" value={val}
                onChange={(e) => onChange(p.key, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()} />

            ) : (
              <input className="wf-param-input" type="text" value={val}
                placeholder={p.hint || p.label}
                onChange={(e) => onChange(p.key, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── WorkflowNode ─────────────────────────────────────────────────────────────
function WorkflowNode({ node, def, layers, selected, onSelect, onRemove, onParamChange,
  onPortMouseDown, onPortMouseUp, activeEdge, portRefs, upstreamFields }) {
  const { updateWorkflowNode } = useAppStore()
  const [expanded, setExpanded] = useState(true)
  const isCompatibleTarget = activeEdge && activeEdge.fromNodeId !== node.id

  const handleHeaderMouseDown = (e) => {
    if (e.target.closest('.wf-node-btn, .wf-node-params, .wf-port-dot')) return
    e.preventDefault()
    e.stopPropagation()
    onSelect(node.id)
    const startX = e.clientX - node.x
    const startY = e.clientY - node.y
    const onMove = (me) => {
      updateWorkflowNode(node.id, { x: me.clientX - startX, y: me.clientY - startY })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      className={`wf-node${selected ? ' wf-node-selected' : ''}`}
      style={{ left: node.x, top: node.y, width: NODE_WIDTH, '--node-color': def.color }}
      onMouseDown={handleHeaderMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id) }}
    >
      {/* ── Header ── */}
      <div className="wf-node-header">
        <span className="wf-node-icon">{def.icon}</span>
        <span className="wf-node-title">{def.label}</span>
        <button className="wf-node-btn" onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
          title={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <IconChevronDown size={11} /> : <IconChevronRight size={11} />}
        </button>
        <button className="wf-node-btn wf-node-btn-remove"
          onClick={(e) => { e.stopPropagation(); onRemove(node.id) }} title="Remove">
          <IconX size={11} />
        </button>
      </div>

      {expanded && (
        <div className="wf-node-body">
          {/* ── Ports zone ── */}
          {(def.inputs.length > 0 || def.outputs.length > 0) && (
            <div className="wf-ports-zone">
              {/* Left: inputs */}
              <div className="wf-ports-col wf-ports-left">
                {def.inputs.map((port) => {
                  const refKey = `${node.id}:input:${port.name}`
                  return (
                    <div key={port.name} className="wf-port-row">
                      <PortDot
                        side="input"
                        isHighlight={isCompatibleTarget}
                        onMouseUp={(e) => { e.stopPropagation(); onPortMouseUp(node.id, port.name) }}
                        portRef={(el) => { if (el) portRefs.current[refKey] = el; else delete portRefs.current[refKey] }}
                        title={port.label}
                      />
                      <span className="wf-port-label">{port.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* Right: outputs */}
              <div className="wf-ports-col wf-ports-right">
                {def.outputs.map((port) => {
                  const refKey = `${node.id}:output:${port.name}`
                  return (
                    <div key={port.name} className="wf-port-row wf-port-row-right">
                      <span className="wf-port-label">{port.label}</span>
                      <PortDot
                        side="output"
                        isHighlight={false}
                        onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(node.id, port.name) }}
                        portRef={(el) => { if (el) portRefs.current[refKey] = el; else delete portRefs.current[refKey] }}
                        title={port.label}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Params ── */}
          {def.params.length > 0 && (
            <ParamEditor def={def} node={node} layers={layers}
              upstreamFields={upstreamFields}
              onChange={(key, val) => onParamChange(node.id, key, val)} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Palette ──────────────────────────────────────────────────────────────────
function Palette({ onAdd }) {
  const [collapsed, setCollapsed] = useState({})
  const toggle = (cat) => setCollapsed((s) => ({ ...s, [cat]: !s[cat] }))

  return (
    <div className="wf-palette">
      <div className="wf-palette-header">Transformers</div>
      {TRANSFORMER_CATEGORIES.map((cat) => {
        const items = Object.entries(TRANSFORMER_DEFS).filter(([, d]) => d.category === cat)
        if (!items.length) return null
        const isCollapsed = collapsed[cat]
        return (
          <div key={cat} className="wf-palette-group">
            <button className="wf-palette-group-header" onClick={() => toggle(cat)}>
              {isCollapsed ? <IconChevronRight size={12} /> : <IconChevronDown size={12} />}
              <span>{cat}</span>
            </button>
            {!isCollapsed && items.map(([type, def]) => (
              <button key={type} className="wf-palette-item"
                style={{ '--item-color': def.color }}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('transformer-type', type)}
                onClick={() => onAdd(type)}
                title={`Add ${def.label}`}
              >
                <span className="wf-palette-item-icon">{def.icon}</span>
                <span>{def.label}</span>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ── Wire overlay — reads real DOM positions ───────────────────────────────────
function WireOverlay({ edges, nodes, portRefs, canvasRef, canvasOffset, runState,
  activeEdge, onRemoveEdge }) {
  const [, forceUpdate] = useState(0)

  // Re-render wires after every node move by subscribing to store
  useEffect(() => {
    const unsub = useAppStore.subscribe(() => forceUpdate(n => n + 1))
    return unsub
  }, [])

  const getPortCenter = (nodeId, side, portName) => {
    const refKey = `${nodeId}:${side}:${portName}`
    const el = portRefs.current[refKey]
    if (!el || !canvasRef.current) return null
    const dotRect    = el.getBoundingClientRect()
    const canvasRect = canvasRef.current.getBoundingClientRect()
    return {
      x: dotRect.left + dotRect.width / 2  - canvasRect.left,
      y: dotRect.top  + dotRect.height / 2 - canvasRect.top,
    }
  }

  const wires = edges.map((edge) => {
    const from = getPortCenter(edge.fromNodeId, 'output', edge.fromPort)
    const to   = getPortCenter(edge.toNodeId,   'input',  edge.toPort)
    if (!from || !to) return null
    const d = bezierPath(from.x, from.y, to.x, to.y)
    return (
      <g key={edge.id} className="wf-wire-group">
        {/* Fat invisible hit area */}
        <path d={d} fill="none" stroke="transparent" strokeWidth={12}
          style={{ cursor: 'pointer' }} onClick={() => onRemoveEdge(edge.id)} />
        {/* Glow */}
        <path d={d} fill="none" stroke="rgba(0,212,200,0.18)" strokeWidth={5} style={{ pointerEvents: 'none' }} />
        {/* Visible wire */}
        <path d={d} fill="none" stroke="#00d4c8" strokeWidth={1.5}
          strokeDasharray={runState === 'running' ? '6 4' : undefined}
          style={{ pointerEvents: 'none' }} />
      </g>
    )
  })

  // Draft wire while dragging
  let draftWire = null
  if (activeEdge) {
    const from = getPortCenter(activeEdge.fromNodeId, 'output', activeEdge.fromPort)
    if (from) {
      draftWire = (
        <path
          d={bezierPath(from.x, from.y, activeEdge.mouseX, activeEdge.mouseY)}
          fill="none" stroke="#00d4c8" strokeWidth={1.5}
          strokeDasharray="5 3" opacity={0.6}
          style={{ pointerEvents: 'none' }}
        />
      )
    }
  }

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {wires}
      {draftWire}
    </svg>
  )
}

// ── Main canvas ───────────────────────────────────────────────────────────────
export default function WorkflowCanvas({ runState }) {
  const {
    layers, workflowNodes, workflowEdges,
    addWorkflowNode, removeWorkflowNode,
    addWorkflowEdge, removeWorkflowEdge,
  } = useAppStore()

  const canvasRef   = useRef(null)
  const portRefs    = useRef({})  // { "nodeId:side:portName" → DOM element }
  const [selectedId, setSelectedId] = useState(null)
  const [activeEdge, setActiveEdge] = useState(null)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef(null)

  const handleMouseMove = useCallback((e) => {
    if (activeEdge) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) setActiveEdge(ae => ae ? { ...ae, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top } : ae)
    }
    if (isPanning && panStart.current) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      panStart.current = { x: e.clientX, y: e.clientY }
      setCanvasOffset(o => ({ x: o.x + dx, y: o.y + dy }))
    }
  }, [activeEdge, isPanning])

  const handleMouseUp = useCallback(() => {
    if (activeEdge) setActiveEdge(null)
    if (isPanning) setIsPanning(false)
  }, [activeEdge, isPanning])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup',   handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup',   handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleCanvasMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY }
    } else if (e.button === 0) {
      setSelectedId(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('transformer-type')
    if (!type) return
    const rect = canvasRef.current.getBoundingClientRect()
    addWorkflowNode({
      type,
      x: e.clientX - rect.left - canvasOffset.x - NODE_WIDTH / 2,
      y: e.clientY - rect.top  - canvasOffset.y - 20,
    })
  }

  const handleAddFromPalette = (type) => {
    // Grid layout: 3 columns, rows spaced 260px apart
    const idx = workflowNodes.length
    const col  = idx % 3
    const row  = Math.floor(idx / 3)
    addWorkflowNode({
      type,
      x: 40  + col * (NODE_WIDTH + 80),
      y: 40  + row * 260,
    })
  }

  const handleParamChange = (nodeId, key, val) => {
    const node = workflowNodes.find(n => n.id === nodeId)
    if (!node) return
    useAppStore.getState().updateWorkflowNode(nodeId, { params: { ...node.params, [key]: val } })
  }

  return (
    <div className="wf-root">
      <Palette onAdd={handleAddFromPalette} />

      <div
        ref={canvasRef}
        className={`wf-canvas${isPanning ? ' wf-canvas-panning' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Grid */}
        <div className="wf-canvas-grid"
          style={{ transform: `translate(${canvasOffset.x % 30}px, ${canvasOffset.y % 30}px)` }} />

        {/* Wire SVG — reads real DOM positions */}
        <WireOverlay
          edges={workflowEdges}
          nodes={workflowNodes}
          portRefs={portRefs}
          canvasRef={canvasRef}
          canvasOffset={canvasOffset}
          runState={runState}
          activeEdge={activeEdge}
          onRemoveEdge={removeWorkflowEdge}
        />

        {/* Nodes layer */}
        <div className="wf-nodes-layer"
          style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)` }}>
          {workflowNodes.map((node) => {
            const def = TRANSFORMER_DEFS[node.type]
            if (!def) return null
            // Compute upstream field context at render time — cheap graph trace
            const upstreamFields = resolveUpstreamFields(node.id, workflowNodes, workflowEdges, layers)
            return (
              <WorkflowNode
                key={node.id}
                node={node}
                def={def}
                layers={layers}
                selected={selectedId === node.id}
                onSelect={setSelectedId}
                onRemove={removeWorkflowNode}
                onParamChange={handleParamChange}
                onPortMouseDown={(nodeId, portName) =>
                  setActiveEdge({ fromNodeId: nodeId, fromPort: portName, mouseX: 0, mouseY: 0 })
                }
                onPortMouseUp={(nodeId, portName) => {
                  if (!activeEdge || activeEdge.fromNodeId === nodeId) return
                  addWorkflowEdge({
                    fromNodeId: activeEdge.fromNodeId,
                    fromPort:   activeEdge.fromPort,
                    toNodeId:   nodeId,
                    toPort:     portName,
                  })
                  setActiveEdge(null)
                }}
                activeEdge={activeEdge}
                portRefs={portRefs}
                upstreamFields={upstreamFields}
              />
            )
          })}
        </div>

        {/* Empty state */}
        {workflowNodes.length === 0 && (
          <div className="wf-empty">
            <div className="wf-empty-icon">⚡</div>
            <div className="wf-empty-title">Build a workflow</div>
            <div className="wf-empty-desc">
              Drag transformers from the left panel onto the canvas,<br />
              then connect their ports to build a pipeline.
            </div>
            <div className="wf-empty-hint">
              Start with a <strong>Layer Reader</strong> → add transformers → end with a <strong>Layer Writer</strong>
            </div>
          </div>
        )}

        <div className="wf-canvas-hint">
          Alt+drag or middle-click to pan · Click a wire to remove it · Drag nodes to reposition
        </div>
      </div>
    </div>
  )
}
