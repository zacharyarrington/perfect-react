import { useState, useRef, useEffect } from 'react'

const PRESET_COLORS = [
  '#00d4c8', '#0099ff', '#7c3aed', '#f59e0b', '#ef4444',
  '#22c55e', '#ec4899', '#f97316', '#06b6d4', '#a855f7',
  '#ffffff', '#94a3b8', '#475569', '#1e293b', '#000000',
]

/**
 * ColorPicker — inline compact color picker with hex input and presets.
 * Props:
 *   value: string (hex color)
 *   onChange: (hex: string) => void
 *   label?: string
 */
export default function ColorPicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const [hex, setHex]   = useState(value || '#00d4c8')
  const wrapRef = useRef(null)

  useEffect(() => { setHex(value || '#00d4c8') }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const commit = (color) => {
    setHex(color)
    onChange?.(color)
  }

  const handleHexInput = (e) => {
    const v = e.target.value
    setHex(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange?.(v)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {label && <span className="label" style={{ marginBottom: 0 }}>{label}</span>}

      {/* Swatch trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: '2px solid rgba(255,255,255,0.15)',
          background: hex,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'border-color 0.15s',
        }}
        title={hex}
      />

      {/* Hex input */}
      <input
        className="input input-sm"
        style={{ width: 88, fontFamily: 'var(--font-mono)' }}
        value={hex}
        onChange={handleHexInput}
      />

      {/* Popover palette */}
      {open && (
        <div style={{
          position:   'absolute',
          top:        36,
          left:       0,
          zIndex:     9999,
          background: 'var(--bg-elevated)',
          border:     '1px solid var(--border-default)',
          borderRadius: 10,
          padding:    12,
          boxShadow:  '0 8px 32px rgba(0,0,0,0.6)',
          width:      220,
        }}>
          {/* Native color input for full spectrum */}
          <input
            type="color"
            value={hex}
            onChange={(e) => commit(e.target.value)}
            style={{ width: '100%', height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', marginBottom: 10 }}
          />

          {/* Preset palette */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { commit(c); setOpen(false) }}
                style={{
                  width: 28, height: 28,
                  borderRadius: 6,
                  background: c,
                  border: c === hex ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title={c}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
