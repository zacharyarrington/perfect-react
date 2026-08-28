import { useState, useMemo } from 'react'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import { IconSearch, IconMoodEmpty } from '@tabler/icons-react'

export default function SearchPanel() {
  const { layers, setSelectedFeatures, openPanel } = useAppStore()

  const [query, setQuery]   = useState('')
  const [layerId, setLayerId] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)

  const layer = useMemo(
    () => layers.find((l) => l.id === layerId) || layers[0] || null,
    [layers, layerId]
  )

  const handleSearch = () => {
    if (!layer || !query.trim()) return
    const q = query.toLowerCase()
    const found = []
    layer.geojson.features.forEach((f, idx) => {
      const match = Object.values(f.properties || {}).some((v) =>
        String(v ?? '').toLowerCase().includes(q)
      )
      if (match) found.push({ index: idx, properties: f.properties || {} })
    })
    setResults(found)
    setSearched(true)
  }

  const handleSelect = (idx) => {
    setSelectedFeatures([{ layerId: layer.id, featureIndex: idx }])
    openPanel('attributes')
  }

  const displayLabel = (props) => {
    // Show first non-null string prop as label, fallback to feature index
    const val = Object.values(props).find((v) => v !== null && v !== undefined && String(v).length > 0)
    return val ? String(val).slice(0, 60) : '—'
  }

  return (
    <FloatingPanel panelKey="search" title="Search Features" icon={<IconSearch size={16} />} defaultWidth={300} defaultHeight={380}>
      {/* Layer selector */}
      <div className="panel-section">
        <div className="form-row">
          <label className="label">Search in Layer</label>
          <select
            className="select"
            value={layerId || layer?.id || ''}
            onChange={(e) => { setLayerId(e.target.value); setResults([]); setSearched(false) }}
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Search input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Search all fields…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn btn-primary" onClick={handleSearch}>Go</button>
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {!searched ? (
          <div className="empty-state" style={{ padding: 24 }}>
            <div className="empty-state-icon"><IconSearch size={32} /></div>
            <div className="empty-state-title">Search your data</div>
            <div className="empty-state-desc">Searches across all attribute fields</div>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}>
            <div className="empty-state-icon"><IconMoodEmpty size={32} /></div>
            <div className="empty-state-title">No matches found</div>
            <div className="empty-state-desc">Try a different search term</div>
          </div>
        ) : (
          <>
            <div className="panel-section" style={{ paddingBottom: 6 }}>
              <span className="badge badge-teal">{results.length} match{results.length !== 1 ? 'es' : ''}</span>
            </div>
            {results.map((r) => (
              <div
                key={r.index}
                style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => handleSelect(r.index)}
              >
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 2 }}>
                  {displayLabel(r.properties)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Feature #{r.index + 1}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {results.length > 0 && (
        <div className="panel-section" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn btn-ghost" style={{ width: '100%', fontSize: 12 }}
            onClick={() => { setResults([]); setQuery(''); setSearched(false) }}>
            Clear Results
          </button>
        </div>
      )}
    </FloatingPanel>
  )
}
