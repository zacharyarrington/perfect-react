// BasemapMenu — dropdown to switch the base map style.
// Used inside <MapView> as an overlay control; also works in the top bar.

import { useState, useRef, useEffect } from 'react'
import useMapStore from './useMapStore'
import { BASE_STYLES } from './mapStyles'
import { IconMap, IconSatellite, IconMoon, IconMountain, IconSun, IconCheck } from '@tabler/icons-react'

function getStyleIcon(id) {
  if (id.includes('satellite')) return <IconSatellite size={15} />
  if (id.includes('dark') || id.includes('night')) return <IconMoon size={15} />
  if (id.includes('outdoor')) return <IconMountain size={15} />
  if (id.includes('light')) return <IconSun size={15} />
  return <IconMap size={15} />
}

export default function BasemapMenu() {
  const { mapStyle, setMapStyle } = useMapStore()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        className={`map-overlay-btn${open ? ' active' : ''}`}
        title="Base map"
        onClick={() => setOpen((o) => !o)}
      >
        <IconMap size={18} />
      </button>

      {open && (
        <div className="basemap-dropdown">
          {BASE_STYLES.map((s) => (
            <button
              key={s.id}
              className={`basemap-option${mapStyle === s.url ? ' active' : ''}`}
              onClick={() => { setMapStyle(s.url); setOpen(false) }}
            >
              {getStyleIcon(s.id)}
              <span style={{ flex: 1, textAlign: 'left' }}>{s.label}</span>
              {mapStyle === s.url && <IconCheck size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
