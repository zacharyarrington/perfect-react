import useAppStore from '../store/useAppStore'
import { IconRuler, IconX } from '@tabler/icons-react'

export default function MeasurePanel() {
  const { measureResult, measureMode, setMeasureMode, setMeasureResult } = useAppStore()

  if (!measureResult && !measureMode) return null

  const clear = () => {
    setMeasureMode(null)
    setMeasureResult(null)
  }

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(var(--glass-blur))',
      WebkitBackdropFilter: 'blur(var(--glass-blur))',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '10px 16px',
      zIndex: 'var(--z-controls)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: 'var(--glass-shadow)',
      pointerEvents: 'auto',
      fontSize: 13,
    }}>
      <span style={{ color: 'var(--accent-secondary)' }}><IconRuler size={18} /></span>

      {!measureResult && (
        <span style={{ color: 'var(--text-secondary)' }}>
          Click on the map to place measurement points
        </span>
      )}

      {measureResult?.type === 'distance' && (
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ color: 'var(--text-muted)' }}>Distance:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{measureResult.km.toFixed(3)} km</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{measureResult.miles.toFixed(3)} mi</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{measureResult.meters.toFixed(0)} m</span>
        </div>
      )}

      {measureResult?.type === 'area' && (
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ color: 'var(--text-muted)' }}>Area:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{measureResult.km2.toFixed(4)} km²</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{measureResult.acres.toFixed(2)} ac</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{measureResult.m2.toFixed(0)} m²</span>
        </div>
      )}

      <button
        onClick={clear}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}
            ><IconX size={14} /></button>
    </div>
  )
}
