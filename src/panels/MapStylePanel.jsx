import { useState, useRef, useEffect } from 'react'
import useAppStore from '../store/useAppStore'
import { BASE_STYLES } from '../map/mapStyles'
import { IconMap, IconSatellite, IconMoon, IconMountain, IconSun, IconCheck } from '@tabler/icons-react'

function getStyleIcon(id) {
  if (id.includes('satellite')) return <IconSatellite size={15} />
  if (id.includes('dark') || id.includes('night')) return <IconMoon size={15} />
  if (id.includes('outdoor')) return <IconMountain size={15} />
  if (id.includes('light')) return <IconSun size={15} />
  return <IconMap size={15} />
}

export default function BasemapMenu({ inTopbar = false }) {
  const { mapStyle, setMapStyle } = useAppStore()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const buttonClass = inTopbar
    ? `btn btn-icon${open ? ' active' : ''}`
    : `launcher-btn${open ? ' active' : ''}`

  const dropdownPos = inTopbar
    ? { top: 'calc(100% + 6px)', right: 0 }
    : { right: 'calc(100% + 8px)', top: 0 }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        className={buttonClass}
        data-tooltip="Base Map"
        title="Base Map"
        onClick={() => setOpen((o) => !o)}
      >
        <IconMap size={inTopbar ? 18 : 20} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          ...dropdownPos,
          width: 190,
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--glass-shadow)',
          overflow: 'hidden',
          zIndex: 500,
        }}>
          <div style={{
            padding: '7px 12px',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            Base Map
          </div>
          {BASE_STYLES.map((s) => (
            <button
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 12px',
                background: mapStyle === s.url ? 'rgba(0,212,200,0.10)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                transition: 'background 0.12s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (mapStyle !== s.url) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { if (mapStyle !== s.url) e.currentTarget.style.background = 'transparent' }}
              onClick={() => { setMapStyle(s.url); setOpen(false) }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{getStyleIcon(s.id)}</span>
              <span style={{
                fontSize: 'var(--text-sm)',
                color: mapStyle === s.url ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontWeight: mapStyle === s.url ? 600 : 400,
                flex: 1,
              }}>
                {s.label}
              </span>
              {mapStyle === s.url && (
                <span style={{ color: 'var(--accent-primary)', fontSize: 12 }}><IconCheck size={14} /></span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
