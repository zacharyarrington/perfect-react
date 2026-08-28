import { useMemo } from 'react'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import { IconFilter, IconSearch, IconX, IconPlus } from '@tabler/icons-react'

const OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'contains', 'starts', 'is null', 'not null']

export default function FilterPanel() {
  const { layers, activeLayerId, setLayerFilters, addToast } = useAppStore()

  const layer = useMemo(() => layers.find((l) => l.id === activeLayerId), [layers, activeLayerId])
  const filters = layer?.filters || []

  const fields = useMemo(() => {
    if (!layer?.geojson?.features?.length) return []
    const keys = new Set()
    for (const f of layer.geojson.features) Object.keys(f.properties || {}).forEach((k) => keys.add(k))
    return [...keys]
  }, [layer])

  const addFilter = () => {
    setLayerFilters(layer.id, [
      ...filters,
      { id: Date.now(), field: fields[0] || '', operator: '=', value: '', groupLogic: filters[0]?.groupLogic || 'all' },
    ])
  }

  const updateFilter = (idx, updates) => {
    const next = filters.map((f, i) => i === idx ? { ...f, ...updates } : f)
    setLayerFilters(layer.id, next)
  }

  const removeFilter = (idx) => {
    const next = filters.filter((_, i) => i !== idx)
    setLayerFilters(layer.id, next)
    addToast({ type: 'info', message: 'Filter removed' })
  }

  const clearAll = () => {
    setLayerFilters(layer.id, [])
    addToast({ type: 'info', message: 'All filters cleared' })
  }

  const setLogic = (logic) => {
    setLayerFilters(layer.id, filters.map((f) => ({ ...f, groupLogic: logic })))
  }

  const needsValue = (op) => !['is null', 'not null'].includes(op)

  return (
    <FloatingPanel panelKey="filters" title="Filters" icon={<IconFilter size={16} />} defaultWidth={340} defaultHeight={380}>
      {!layer ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconFilter size={32} /></div>
          <div className="empty-state-title">Select a layer to filter</div>
        </div>
      ) : (
        <>
          {/* Layer selector */}
          <div className="panel-section">
            <div className="section-label">Layer</div>
            <select className="select" value={activeLayerId || ''} onChange={(e) => useAppStore.getState().setActiveLayer(e.target.value)}>
              {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Logic toggle */}
          {filters.length > 1 && (
            <div className="panel-section">
              <div className="section-label">Combine filters with</div>
              <div className="logic-toggle">
                <button className={filters[0]?.groupLogic !== 'or' ? 'active' : ''} onClick={() => setLogic('all')}>AND</button>
                <button className={filters[0]?.groupLogic === 'or' ? 'active' : ''} onClick={() => setLogic('or')}>OR</button>
              </div>
            </div>
          )}

          {/* Filter rules */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filters.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="empty-state-icon"><IconSearch size={32} /></div>
                <div className="empty-state-title">No filters</div>
                <div className="empty-state-desc">All features are shown</div>
              </div>
            ) : (
              filters.map((f, idx) => (
                <div key={f.id} className="filter-rule">
                  <select className="select input-sm" style={{ flex: '0 0 100px' }} value={f.field} onChange={(e) => updateFilter(idx, { field: e.target.value })}>
                    {fields.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <select className="select input-sm" style={{ flex: '0 0 90px' }} value={f.operator} onChange={(e) => updateFilter(idx, { operator: e.target.value })}>
                    {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                  {needsValue(f.operator) && (
                    <input
                      className="input input-sm"
                      style={{ flex: 1 }}
                      value={f.value}
                      placeholder="Value…"
                      onChange={(e) => updateFilter(idx, { value: e.target.value })}
                    />
                  )}
                  <button
                    className="filter-chip-remove"
                    style={{ fontSize: 16, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => removeFilter(idx)}
                  ><IconX size={14} /></button>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="panel-section" style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-subtle)' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={addFilter}><IconPlus size={14} /> Add Filter</button>
            {filters.length > 0 && (
              <button className="btn btn-ghost" onClick={clearAll}>Clear All</button>
            )}
          </div>

          {/* Active filter chips */}
          {filters.length > 0 && (
            <div className="panel-section" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {filters.map((f, i) => (
                <span key={f.id} className="filter-chip">
                  {f.field} {f.operator} {f.value}
                  <button className="filter-chip-remove" onClick={() => removeFilter(i)}><IconX size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </FloatingPanel>
  )
}
