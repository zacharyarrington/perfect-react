import { useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import { updateProfile, deleteProfile, clearActiveProfileId, AVATAR_COLORS } from '../storage/profileManager'
import { BUILTIN_PRESETS, listUserPresets, saveUserPreset, deleteUserPreset } from '../storage/layoutPresets'
import { deepClean } from '../storage/deepClean'
import { switchSession } from '../storage/sessionSwitch'
import {
  IconSettings, IconRefresh, IconUser, IconEdit, IconCheck,
  IconTrash, IconLogout, IconUserPlus, IconPlus, IconLayout, IconHelp,
  IconAlertTriangle,
} from '@tabler/icons-react'
import { startTour, resetTour } from '../tour/useTour'

function getInitials(name = '') {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

export default function SettingsPanel() {
  const { resetPanels, addToast, activeProfile, setActiveProfile, setShowLoginDialog } = useAppStore()
  const { isSignedIn, user } = useUser()
  const { signOut } = useClerk()

  // Active profile belongs to the signed-in Clerk account
  const linked = Boolean(isSignedIn && user && activeProfile?.clerkUserId === user.id)

  const [editingName, setEditingName]   = useState(false)
  const [draftName, setDraftName]       = useState('')
  const [draftColor, setDraftColor]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deepCleanConfirm, setDeepCleanConfirm] = useState(false)
  const [deepCleaning, setDeepCleaning] = useState(false)

  // Layout preset state
  const [userPresets, setUserPresets]   = useState(() => listUserPresets())
  const [savingPreset, setSavingPreset] = useState(false)
  const [presetName, setPresetName]     = useState('')

  const handleResetPanels = () => {
    resetPanels()
    addToast({ type: 'success', message: 'Panel positions reset to defaults' })
  }

  const handleApplyPreset = (preset) => {
    useAppStore.setState((s) => ({
      panels: { ...s.panels, ...preset.panels },
    }))
    addToast({ type: 'info', message: `Layout "${preset.name}" applied` })
  }

  const handleSavePreset = () => {
    if (!presetName.trim()) return
    const preset = saveUserPreset(presetName, useAppStore.getState().panels)
    setUserPresets(listUserPresets())
    setPresetName('')
    setSavingPreset(false)
    addToast({ type: 'success', message: `Layout "${preset.name}" saved` })
  }

  const handleDeletePreset = (id) => {
    deleteUserPreset(id)
    setUserPresets(listUserPresets())
  }

  const handleEditStart = () => {
    setDraftName(activeProfile.username)
    setDraftColor(activeProfile.color)
    setEditingName(true)
  }

  const handleEditSave = async () => {
    if (!draftName.trim()) return
    try {
      const updated = await updateProfile(activeProfile.id, {
        username: draftName.trim(),
        color: draftColor,
      })
      setActiveProfile(updated)
      setEditingName(false)
      addToast({ type: 'success', message: 'Profile updated' })
    } catch (e) {
      addToast({ type: 'error', message: e.message })
    }
  }

  const handleDeleteProfile = async () => {
    const wasLinked = linked
    await deleteProfile(activeProfile.id)
    clearActiveProfileId()
    useAppStore.getState().resetAppState()
    setDeleteConfirm(false)
    // Deleting a linked profile also signs out of the Clerk account so the
    // adoption flow doesn't recreate it on the next load.
    if (wasLinked) await signOut().catch(() => {})
    addToast({ type: 'info', message: 'Profile deleted' })
  }

  const handleSignOut = async () => {
    const outgoingId = activeProfile?.id || null
    const wasLinked = linked
    clearActiveProfileId()
    await switchSession(outgoingId, null)
    if (wasLinked) await signOut().catch(() => {})
    addToast({ type: 'info', message: 'Signed out — continuing as guest' })
  }

  const handleDeepClean = async () => {
    setDeepCleaning(true)
    try {
      await deepClean()
      addToast({ type: 'success', message: 'Deep clean complete — everything wiped, starting fresh' })
    } catch (e) {
      addToast({ type: 'error', message: `Deep clean failed: ${e.message}` })
    } finally {
      setDeepCleaning(false)
      setDeepCleanConfirm(false)
    }
  }

  return (
    <FloatingPanel panelKey="settings" title="Settings" icon={<IconSettings size={16} />} defaultWidth={300} defaultHeight={420}>

      {/* Profile section */}
      <div className="panel-section">
        <div className="section-label">Profile</div>

        {activeProfile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {editingName ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  className="input input-sm"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                  autoFocus
                  maxLength={32}
                  placeholder="Username…"
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDraftColor(c)}
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: c, border: draftColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                        cursor: 'pointer', padding: 0,
                      }}
                      aria-label={c}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleEditSave}>
                    <IconCheck size={14} /> Save
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingName(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="profile-avatar" style={{ background: activeProfile.color, flexShrink: 0 }}>
                  {getInitials(activeProfile.username)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeProfile.username}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {linked ? (user?.primaryEmailAddress?.emailAddress || 'Connected account') : 'Local Profile'}
                  </div>
                </div>
                <button className="btn btn-icon btn-ghost" onClick={handleEditStart} data-tooltip="Edit profile">
                  <IconEdit size={14} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}
                onClick={() => setShowLoginDialog(true)}
              >
                <IconUser size={14} /> Switch Profile
              </button>
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}
                onClick={handleSignOut}
              >
                <IconLogout size={14} /> Sign Out
              </button>

              {deleteConfirm ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleDeleteProfile}>
                    Confirm Delete
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(false)}>Cancel</button>
                </div>
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 8, color: 'var(--accent-danger)' }}
                  onClick={() => setDeleteConfirm(true)}
                >
                  <IconTrash size={14} /> Delete Profile
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
              You're in guest mode. Create a profile to save your settings and layout.
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', gap: 8 }}
              onClick={() => setShowLoginDialog(true)}
            >
              <IconUserPlus size={14} /> Create Profile / Sign In
            </button>
          </div>
        )}
      </div>

      {/* Layout Presets section */}
      <div className="panel-section">
        <div className="section-label"><IconLayout size={12} style={{ marginRight: 4 }} />Layout Presets</div>

        {/* Built-in presets */}
        <div className="preset-grid">
          {BUILTIN_PRESETS.map((p) => (
            <button
              key={p.id}
              className="preset-btn"
              data-tooltip={p.description}
              onClick={() => handleApplyPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* User presets */}
        {userPresets.length > 0 && (
          <>
            <div className="preset-divider-label">Saved</div>
            {userPresets.map((p) => (
              <div key={p.id} className="preset-row">
                <button className="preset-row-btn" onClick={() => handleApplyPreset(p)}>
                  {p.name}
                </button>
                <button
                  className="btn btn-icon btn-ghost"
                  style={{ width: 24, height: 24, flexShrink: 0, color: 'var(--accent-danger)' }}
                  onClick={() => handleDeletePreset(p.id)}
                  aria-label="Delete preset"
                >
                  <IconTrash size={12} />
                </button>
              </div>
            ))}
          </>
        )}

        {/* Save current layout */}
        {savingPreset ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              className="input input-sm"
              style={{ flex: 1 }}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') setSavingPreset(false) }}
              placeholder="Layout name…"
              autoFocus
              maxLength={32}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSavePreset} disabled={!presetName.trim()}>
              <IconCheck size={14} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSavingPreset(false)}>
              ✕
            </button>
          </div>
        ) : (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 8, marginTop: 8 }}
            onClick={() => setSavingPreset(true)}
          >
            <IconPlus size={14} /> Save Current Layout
          </button>
        )}
      </div>

      {/* Layout reset */}
      <div className="panel-section">
        <div className="section-label">Layout</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}
            onClick={handleResetPanels}
          >
            <IconRefresh size={16} /> Reset Panel Positions
          </button>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
            Moves all panels back to their default positions and sizes.
          </p>
        </div>
      </div>

      {/* Help */}
      <div className="panel-section">
        <div className="section-label">Help</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}
            onClick={() => { resetTour(); startTour() }}
          >
            <IconHelp size={16} /> Take the Tour
          </button>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
            Replay the welcome tour to re-familiarize yourself with the app.
          </p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="panel-section">
        <div className="section-label" style={{ color: 'var(--accent-danger)' }}>
          <IconAlertTriangle size={12} style={{ marginRight: 4 }} />Danger Zone
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deepCleanConfirm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-danger)', margin: 0, fontWeight: 600 }}>
                This permanently deletes every saved project, profile, and cached
                setting on this device, and cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ flex: 1 }}
                  onClick={handleDeepClean}
                  disabled={deepCleaning}
                >
                  {deepCleaning ? 'Cleaning…' : 'Confirm Deep Clean'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDeepCleanConfirm(false)} disabled={deepCleaning}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 8, color: 'var(--accent-danger)' }}
                onClick={() => setDeepCleanConfirm(true)}
              >
                <IconTrash size={14} /> Deep Clean
              </button>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
                Wipes every saved project, profile, and cached setting on this
                device (browser storage + this session) so the app starts
                completely fresh.
              </p>
            </>
          )}
        </div>
      </div>

    </FloatingPanel>
  )
}
