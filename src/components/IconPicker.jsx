import { useState } from 'react'

// Mapbox GL built-in icon names (subset)
const BUILTIN_ICONS = [
  'circle', 'square', 'triangle', 'star',
  'airport', 'bar', 'cafe', 'camera',
  'campsite', 'car', 'castle', 'cemetery',
  'college', 'danger', 'embassy', 'fast-food',
  'fire-station', 'fuel', 'garden', 'golf',
  'grocery', 'harbor', 'hospital', 'information',
  'library', 'lodging', 'marker', 'monument',
  'museum', 'parking', 'park', 'pharmacy',
  'pitch', 'place-of-worship', 'playground', 'police',
  'post', 'prison', 'rail', 'restaurant',
  'rocket', 'school', 'shop', 'swimming',
  'theatre', 'toilet', 'town-hall', 'zoo',
]

const CATEGORIES = {
  'Basic':     ['circle', 'square', 'triangle', 'star', 'marker', 'rocket'],
  'Transport': ['airport', 'car', 'fuel', 'harbor', 'rail'],
  'Food':      ['bar', 'cafe', 'fast-food', 'grocery', 'restaurant'],
  'Places':    ['castle', 'embassy', 'library', 'monument', 'museum', 'park', 'town-hall', 'zoo'],
  'Services':  ['hospital', 'pharmacy', 'fire-station', 'police', 'post', 'school'],
  'Amenities': ['campsite', 'golf', 'parking', 'pitch', 'playground', 'swimming', 'theatre', 'toilet'],
}

/**
 * IconPicker — grid picker for Mapbox built-in icon names + custom URL option.
 * Props:
 *   value: string (icon id)
 *   onChange: (icon: string) => void
 *   label?: string
 */
export default function IconPicker({ value, onChange, label }) {
  const [open, setOpen]       = useState(false)
  const [category, setCategory] = useState('Basic')
  const [customUrl, setCustomUrl] = useState('')
  const [tab, setTab]         = useState('builtin')

  const icons = CATEGORIES[category] || BUILTIN_ICONS

  return (
    <div style={{ position: 'relative' }}>
      {label && <div className="label">{label}</div>}

      {/* Trigger */}
      <button
        className="btn btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{value || 'circle'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11 }}>▾</span>
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position:   'absolute',
          top:        40,
          left:       0,
          zIndex:     9999,
          background: 'var(--bg-elevated)',
          border:     '1px solid var(--border-default)',
          borderRadius: 10,
          padding:    14,
          boxShadow:  '0 8px 32px rgba(0,0,0,0.6)',
          width:      260,
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button className={`tab-btn${tab === 'builtin' ? ' active' : ''}`} onClick={() => setTab('builtin')}>Built-in</button>
            <button className={`tab-btn${tab === 'custom' ? ' active' : ''}`} onClick={() => setTab('custom')}>Custom URL</button>
          </div>

          {tab === 'builtin' ? (
            <>
              {/* Category selector */}
              <select className="select" style={{ marginBottom: 10 }}
                value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.keys(CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Icon grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 220, overflow: 'auto' }}>
                {icons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => { onChange?.(icon); setOpen(false) }}
                    style={{
                      padding: '6px 4px',
                      borderRadius: 6,
                      border: icon === value ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: icon === value ? 'rgba(0,212,200,0.10)' : 'var(--bg-base)',
                      color: icon === value ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontSize: 10,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1.3,
                      transition: 'all 0.1s',
                    }}
                    title={icon}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div>
              <div className="section-label">Custom icon URL (PNG/SVG)</div>
              <input
                className="input"
                placeholder="https://example.com/icon.png"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <button className="btn btn-primary" style={{ width: '100%' }}
                onClick={() => { if (customUrl) { onChange?.(customUrl); setOpen(false) } }}>
                Use Custom Icon
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
