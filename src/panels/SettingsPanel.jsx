// SettingsPanel — app-level preferences: theme, layout reset, data wipe.

import { useState } from 'react'
import localforage from 'localforage'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import { IconSettings, IconRefresh, IconTrash } from '@tabler/icons-react'

export default function SettingsPanel() {
  const { theme, setTheme, resetPanels, addToast } = useAppStore()
  const [confirmWipe, setConfirmWipe] = useState(false)

  const handleResetLayout = () => {
    resetPanels()
    addToast({ type: 'success', message: 'Panel layout reset to defaults' })
  }

  const handleWipeData = async () => {
    await localforage.clear()
    localStorage.clear()
    window.location.reload()
  }

  return (
    <FloatingPanel
      panelKey="settings"
      title="Settings"
      icon={<IconSettings size={16} />}
      defaultWidth={320}
      defaultHeight={400}
    >
      <div className="panel-section">
        <div className="section-label">Appearance</div>
        <div className="form-row">
          <label className="label">Theme</label>
          <select className="select" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="auto">Auto (follow OS)</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-label">Layout</div>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={handleResetLayout}>
          <IconRefresh size={14} /> Reset panel layout
        </button>
      </div>

      <div className="panel-section">
        <div className="section-label">Data</div>
        {confirmWipe ? (
          <div className="login-delete-confirm" style={{ padding: 'var(--space-3)' }}>
            <span style={{ flex: 1 }}>Delete all local data (users, notes, layouts)?</span>
            <button className="btn btn-danger btn-sm" onClick={handleWipeData}>Wipe</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmWipe(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setConfirmWipe(true)}>
            <IconTrash size={14} /> Clear all local data
          </button>
        )}
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
          Everything is stored in this browser only — clearing removes all users, preferences, and panel content.
        </p>
      </div>
    </FloatingPanel>
  )
}
