import { useEffect, useState } from 'react'
import { IconMapPin, IconX } from '@tabler/icons-react'

function getSampleValues(rows, column) {
  return rows
    .map((row) => row?.[column])
    .filter((value) => value !== undefined && value !== null && `${value}`.trim() !== '')
    .slice(0, 3)
}

export default function CoordinateColumnDialog({
  open,
  fileName,
  columns = [],
  sampleRows = [],
  suggestedLatKey,
  suggestedLngKey,
  showApplyToAll = false,
  onCancel,
  onConfirm,
}) {
  const [latKey, setLatKey] = useState('')
  const [lngKey, setLngKey] = useState('')
  const [applyToAll, setApplyToAll] = useState(false)

  useEffect(() => {
    if (!open) return
    setLatKey(suggestedLatKey || '')
    setLngKey(suggestedLngKey || '')
    setApplyToAll(false)
  }, [open, suggestedLatKey, suggestedLngKey, fileName])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const latSamples = latKey ? getSampleValues(sampleRows, latKey) : []
  const lngSamples = lngKey ? getSampleValues(sampleRows, lngKey) : []
  const canConfirm = Boolean(latKey && lngKey && latKey !== lngKey)

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ width: 'min(560px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="topbar-logo-icon" style={{ width: 36, height: 36 }}>
              <IconMapPin size={18} />
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: 'var(--text-lg)' }}>Choose coordinate columns</div>
              <div className="empty-state-desc">{fileName}</div>
            </div>
          </div>
          <button className="login-close-btn" onClick={onCancel} aria-label="Close coordinate picker">
            <IconX size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gap: 16 }}>
          <p className="empty-state-desc" style={{ margin: 0 }}>
            Select the latitude and longitude fields to turn each row into a map point.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Latitude column</span>
              <select className="select" value={latKey} onChange={(event) => setLatKey(event.target.value)}>
                <option value="">Select latitude column…</option>
                {columns.map((column) => (
                  <option key={column} value={column}>{column}</option>
                ))}
              </select>
              <div className="empty-state-desc">
                {latSamples.length > 0 ? `Sample values: ${latSamples.join(', ')}` : 'No sample values available yet.'}
              </div>
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Longitude column</span>
              <select className="select" value={lngKey} onChange={(event) => setLngKey(event.target.value)}>
                <option value="">Select longitude column…</option>
                {columns.map((column) => (
                  <option key={column} value={column}>{column}</option>
                ))}
              </select>
              <div className="empty-state-desc">
                {lngSamples.length > 0 ? `Sample values: ${lngSamples.join(', ')}` : 'No sample values available yet.'}
              </div>
            </label>
          </div>

          {latKey && lngKey && latKey === lngKey && (
            <div className="empty-state-desc" style={{ color: 'var(--accent-danger)' }}>
              Latitude and longitude must use different columns.
            </div>
          )}
        </div>

        <div className="modal-footer">
          {showApplyToAll && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
              />
              Apply to all remaining files
            </label>
          )}
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={!canConfirm} onClick={() => onConfirm({ latKey, lngKey, applyToAll })}>
            Import points
          </button>
        </div>
      </div>
    </div>
  )
}