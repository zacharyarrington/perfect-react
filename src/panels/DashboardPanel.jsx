import { useState, useMemo } from 'react'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  IconChartBar, IconPencil, IconX, IconAlertTriangle,
  IconChartPie, IconChartDots, IconChevronDown, IconChevronUp
} from '@tabler/icons-react'

const CHART_TYPES = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'pie', label: 'Pie' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'histogram', label: 'Histogram' },
]
const AGGREGATIONS = ['count', 'sum', 'avg', 'min', 'max']
const CHART_COLORS = ['#00d4c8', '#0099ff', '#7c3aed', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#f97316', '#06b6d4']
const CHART_HEIGHTS = { sm: 140, md: 200, lg: 300 }
const MAX_SCATTER_POINTS = 500
const MAX_PIE_SLICES = 10

// Detect if a field looks numeric across a sample of features
function fieldIsNumeric(features, key, sampleSize = 20) {
  const sample = features.slice(0, sampleSize)
  const parsed = sample.map((f) => Number(f.properties?.[key])).filter((v) => !isNaN(v))
  return parsed.length / sample.length >= 0.7
}

// Aggregate grouped data
function aggregate(values, method) {
  if (!values.length) return 0
  switch (method) {
    case 'count': return values.length
    case 'sum': return values.reduce((a, b) => a + b, 0)
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length
    case 'min': return Math.min(...values)
    case 'max': return Math.max(...values)
    default: return values.length
  }
}

function buildChartData(layer, chart) {
  const features = layer?.geojson?.features
  if (!features?.length) return { data: [], truncated: false }

  if (chart.type === 'bar' || chart.type === 'line') {
    const { xField, yField, aggregation = 'count' } = chart
    if (!xField) return { data: [], truncated: false }

    if (yField && aggregation !== 'count') {
      // Group by xField, aggregate yField
      const groups = {}
      for (const f of features) {
        const key = String(f.properties?.[xField] ?? 'null').slice(0, 30)
        const val = Number(f.properties?.[yField])
        if (!groups[key]) groups[key] = []
        if (!isNaN(val)) groups[key].push(val)
      }
      const data = Object.entries(groups)
        .map(([name, vals]) => ({ name, value: Number(aggregate(vals, aggregation).toFixed(3)) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 50)
      return { data, truncated: Object.keys(groups).length > 50 }
    } else {
      // Count occurrences per xField value
      const counts = {}
      for (const f of features) {
        const key = String(f.properties?.[xField] ?? 'null').slice(0, 30)
        counts[key] = (counts[key] || 0) + 1
      }
      const all = Object.entries(counts).map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
      const data = all.slice(0, 50)
      return { data, truncated: all.length > 50 }
    }
  }

  if (chart.type === 'pie') {
    const { field } = chart
    if (!field) return { data: [], truncated: false }
    const counts = {}
    for (const f of features) {
      const v = String(f.properties?.[field] ?? 'null')
      counts[v] = (counts[v] || 0) + 1
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, MAX_PIE_SLICES)
    const rest = sorted.slice(MAX_PIE_SLICES)
    const data = top.map(([name, value]) => ({ name, value }))
    if (rest.length) {
      const otherSum = rest.reduce((s, [, v]) => s + v, 0)
      data.push({ name: `Other (${rest.length})`, value: otherSum })
    }
    return { data, truncated: rest.length > 0 }
  }

  if (chart.type === 'scatter') {
    const { xField, yField } = chart
    if (!xField || !yField) return { data: [], truncated: false }
    const all = features
      .map((f) => ({
        x: Number(f.properties?.[xField]),
        y: Number(f.properties?.[yField]),
      }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y))

    // Random downsample for performance
    let data = all
    let truncated = false
    if (all.length > MAX_SCATTER_POINTS) {
      const step = Math.ceil(all.length / MAX_SCATTER_POINTS)
      data = all.filter((_, i) => i % step === 0)
      truncated = true
    }
    return { data, truncated }
  }

  if (chart.type === 'histogram') {
    const { xField, bins: binCount = 10 } = chart
    if (!xField) return { data: [], truncated: false }
    const values = features
      .map((f) => Number(f.properties?.[xField]))
      .filter((v) => !isNaN(v))
    if (!values.length) return { data: [], truncated: false }

    const min = Math.min(...values)
    const max = Math.max(...values)
    if (min === max) return { data: [{ name: String(min), count: values.length }], truncated: false }

    const bins = Math.min(Math.max(binCount, 5), 30)
    const step = (max - min) / bins
    const buckets = Array.from({ length: bins }, (_, i) => ({
      name: `${(min + step * i).toFixed(2)}`,
      count: 0,
    }))
    for (const v of values) {
      const bi = Math.min(Math.floor((v - min) / step), bins - 1)
      if (buckets[bi]) buckets[bi].count++
    }
    return { data: buckets, truncated: false }
  }

  return { data: [], truncated: false }
}

function ChartIcon({ type }) {
  if (type === 'pie') return <IconChartPie size={12} />
  if (type === 'scatter') return <IconChartDots size={12} />
  return <IconChartBar size={12} />
}

const tooltipStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  fontSize: 11,
}
const tickStyle = { fill: '#8fa3c8', fontSize: 10 }
const gridStyle = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.05)' }

function ChartContent({ chart, data }) {
  const h = CHART_HEIGHTS[chart.size || 'md']

  if (chart.type === 'bar' || chart.type === 'line') {
    const El = chart.type === 'bar' ? BarChart : LineChart
    return (
      <ResponsiveContainer width="100%" height={h}>
        <El data={data} margin={{ top: 4, right: 8, left: -16, bottom: 24 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="name" tick={{ ...tickStyle }} angle={-35} textAnchor="end" interval="preserveStartEnd" />
          <YAxis tick={{ ...tickStyle }} />
          <Tooltip contentStyle={tooltipStyle} />
          {chart.type === 'bar'
            ? <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} maxBarSize={40} />
            : <Line dataKey="value" stroke={CHART_COLORS[0]} dot={false} strokeWidth={2} />
          }
        </El>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={Math.floor(h * 0.36)}
            label={({ name, percent }) => percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''}
            labelLine={false}
          >
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n]} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: '#8fa3c8' }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ScatterChart margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="x" name={chart.xField} tick={{ ...tickStyle }} label={{ value: chart.xField, position: 'insideBottom', offset: -4, fontSize: 9, fill: '#8fa3c8' }} />
          <YAxis dataKey="y" name={chart.yField} tick={{ ...tickStyle }} label={{ value: chart.yField, angle: -90, position: 'insideLeft', offset: 12, fontSize: 9, fill: '#8fa3c8' }} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={CHART_COLORS[0]} opacity={0.6} />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'histogram') {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="name" tick={{ ...tickStyle }} interval="preserveStartEnd" />
          <YAxis tick={{ ...tickStyle }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return null
}

function ChartWidget({ chart, layer, onRemove, onEdit }) {
  const { data, truncated } = useMemo(() => buildChartData(layer, chart), [layer, chart])
  const [collapsed, setCollapsed] = useState(false)

  const layerMissing = !layer
  const featureCount = layer?.geojson?.features?.length ?? 0

  return (
    <div className="chart-widget">
      <div className="chart-widget-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <ChartIcon type={chart.type} />
          <div style={{ minWidth: 0 }}>
            <div className="chart-title">{chart.title || `${chart.type} chart`}</div>
            {layer && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                {layer.name} · {featureCount.toLocaleString()} features
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button className="btn-icon chart-hdr-btn" onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <IconChevronDown size={13} /> : <IconChevronUp size={13} />}
          </button>
          <button className="btn-icon chart-hdr-btn" onClick={onEdit} title="Edit chart">
            <IconPencil size={13} />
          </button>
          <button className="btn-icon chart-hdr-btn" onClick={onRemove} title="Remove chart">
            <IconX size={13} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {layerMissing ? (
            <div className="chart-empty-state">
              <IconAlertTriangle size={16} style={{ color: 'var(--color-warning, #f59e0b)' }} />
              <span>Layer no longer exists</span>
            </div>
          ) : data.length === 0 ? (
            <div className="chart-empty-state">
              <span>Configure fields to see chart</span>
            </div>
          ) : (
            <>
              <ChartContent chart={chart} data={data} />
              {truncated && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                  {chart.type === 'scatter'
                    ? `Showing ${MAX_SCATTER_POINTS} sampled points`
                    : 'Showing top results — some values omitted'}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function FieldSelect({ label, value, fields, onChange, hint }) {
  return (
    <div className="form-row">
      <label className="label">{label}</label>
      <select className="select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Select —</option>
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.key}{f.numeric ? ' (#)' : ''}
          </option>
        ))}
      </select>
      {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
    </div>
  )
}

export default function DashboardPanel() {
  const { layers, activeLayerId, dashboardCharts, addChart, removeChart, updateChart } = useAppStore()
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({})
  const [showAdd, setShowAdd] = useState(false)

  const draftLayerId = draft.layerId || activeLayerId
  const draftLayer = useMemo(() => layers.find((l) => l.id === draftLayerId), [layers, draftLayerId])

  const fields = useMemo(() => {
    const features = draftLayer?.geojson?.features
    if (!features?.length) return []
    const keys = new Set()
    for (const f of features) Object.keys(f.properties || {}).forEach((k) => keys.add(k))
    return [...keys].map((key) => ({ key, numeric: fieldIsNumeric(features, key) }))
  }, [draftLayer])

  const numericFields = fields.filter((f) => f.numeric)

  const setDraftField = (key, val) => setDraft((d) => ({ ...d, [key]: val }))

  const openAdd = () => {
    setShowAdd(true)
    setEditingId(null)
    setDraft({ type: 'bar', layerId: activeLayerId, aggregation: 'count', size: 'md' })
  }

  const saveChart = () => {
    if (editingId) {
      updateChart(editingId, draft)
    } else {
      addChart({ ...draft, layerId: draftLayerId })
    }
    setShowAdd(false)
    setEditingId(null)
    setDraft({})
  }

  const needsXY = ['bar', 'line', 'scatter'].includes(draft.type)
  const needsAgg = ['bar', 'line'].includes(draft.type)
  const showYField = needsAgg && draft.aggregation !== 'count'

  return (
    <FloatingPanel panelKey="dashboard" title="Dashboard" icon={<IconChartBar size={16} />} defaultWidth={520} defaultHeight={500} minWidth={360}>
      <div className="panel-section" style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={openAdd}>
          ＋ Add Chart
        </button>
      </div>

      {(showAdd || editingId) && (
        <div className="panel-section" style={{ background: 'var(--bg-elevated)', margin: '0 12px 12px', borderRadius: 10, padding: 14 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>
            {editingId ? 'Edit Chart' : 'New Chart'}
          </div>

          <div className="form-row">
            <label className="label">Chart Type</label>
            <select className="select" value={draft.type || 'bar'}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value, xField: undefined, yField: undefined, field: undefined }))}>
              {CHART_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-row">
            <label className="label">Data Layer</label>
            <select className="select" value={draftLayerId || ''}
              onChange={(e) => setDraft((d) => ({ ...d, layerId: e.target.value, xField: undefined, yField: undefined, field: undefined }))}>
              {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {(needsXY || draft.type === 'histogram') && (
            <FieldSelect
              label={draft.type === 'histogram' ? 'Value Field' : 'X Field (group by)'}
              value={draft.xField}
              fields={draft.type === 'histogram' ? numericFields : fields}
              onChange={(v) => setDraftField('xField', v)}
              hint={draft.type === 'histogram' ? 'Must be numeric' : null}
            />
          )}

          {needsAgg && (
            <div className="form-row">
              <label className="label">Aggregation</label>
              <select className="select" value={draft.aggregation || 'count'}
                onChange={(e) => setDraft((d) => ({ ...d, aggregation: e.target.value, yField: e.target.value === 'count' ? undefined : d.yField }))}>
                {AGGREGATIONS.map((a) => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
              </select>
            </div>
          )}

          {(showYField || draft.type === 'scatter') && (
            <FieldSelect
              label="Y Field"
              value={draft.yField}
              fields={numericFields}
              onChange={(v) => setDraftField('yField', v)}
              hint="Numeric fields only"
            />
          )}

          {draft.type === 'pie' && (
            <FieldSelect
              label="Category Field"
              value={draft.field}
              fields={fields}
              onChange={(v) => setDraftField('field', v)}
            />
          )}

          {draft.type === 'histogram' && (
            <div className="form-row">
              <label className="label">Bins</label>
              <input
                className="input input-sm"
                type="number"
                min={5}
                max={30}
                value={draft.bins || 10}
                onChange={(e) => setDraftField('bins', Number(e.target.value))}
                style={{ width: 70 }}
              />
            </div>
          )}

          <div className="form-row">
            <label className="label">Size</label>
            <select className="select" value={draft.size || 'md'} onChange={(e) => setDraftField('size', e.target.value)}>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>

          <div className="form-row">
            <label className="label">Title</label>
            <input className="input input-sm" value={draft.title || ''} placeholder="Chart title…"
              onChange={(e) => setDraftField('title', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveChart}>
              {editingId ? 'Update' : 'Add Chart'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setEditingId(null); setDraft({}) }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {dashboardCharts.length === 0 && !showAdd ? (
          <div className="empty-state">
            <div className="empty-state-icon"><IconChartBar size={32} /></div>
            <div className="empty-state-title">No charts yet</div>
            <div className="empty-state-desc">Add a chart to visualize your layer data</div>
          </div>
        ) : (
          dashboardCharts.map((chart) => {
            const chartLayer = layers.find((l) => l.id === chart.layerId)
            return (
              <ChartWidget
                key={chart.id}
                chart={chart}
                layer={chartLayer}
                onRemove={() => removeChart(chart.id)}
                onEdit={() => { setEditingId(chart.id); setDraft({ ...chart }); setShowAdd(false) }}
              />
            )
          })
        )}
      </div>
    </FloatingPanel>
  )
}
