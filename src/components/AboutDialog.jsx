import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconMap, IconX } from '@tabler/icons-react'

export default function AboutDialog({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(480px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="topbar-logo-icon" style={{ width: 36, height: 36 }}>
              <IconMap size={18} />
            </div>
            <div className="modal-title" style={{ fontSize: 'var(--text-lg)' }}>About ReadyMapGo</div>
          </div>
          <button className="login-close-btn" onClick={onClose} aria-label="Close about dialog">
            <IconX size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
          <p className="empty-state-desc" style={{ margin: 0 }}>
            ReadyMapGo is a dream tool for GIS professionals, built with React, Mapbox, and other modern web technologies. It provides a user-friendly interface for visualizing and analyzing geospatial data, making it easier than ever to create stunning maps and gain insights from your data.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
