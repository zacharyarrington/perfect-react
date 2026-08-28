import { useState, useEffect, useRef } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import useAppStore from '../store/useAppStore'
import {
  listProfiles, createProfile, deleteProfile,
  setActiveProfileId, clearActiveProfileId,
  markProfilePrompted, AVATAR_COLORS,
  saveProfilePreferences, saveProfileLayout,
} from '../storage/profileManager'
import { switchSession } from '../storage/sessionSwitch'
import {
  IconMap, IconUserCircle, IconPlus, IconTrash,
  IconLogout, IconCheck, IconX, IconUser, IconCloud,
} from '@tabler/icons-react'

function getInitials(name = '') {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

export default function LoginDialog({ onClose }) {
  const { setActiveProfile, setShowLoginDialog, appTheme, panels, addToast } = useAppStore()
  const { isSignedIn } = useUser()
  const { openSignIn } = useClerk()

  const [profiles, setProfiles]       = useState([])
  const [mode, setMode]               = useState('loading')  // loading | list | create
  const [username, setUsername]       = useState('')
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0])
  const [busy, setBusy]               = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // profile id to confirm delete
  const inputRef = useRef(null)

  useEffect(() => {
    listProfiles().then((list) => {
      setProfiles(list)
      setMode(list.length === 0 ? 'create' : 'list')
    })
  }, [])

  // Auto-pick a color not yet used
  useEffect(() => {
    if (mode === 'create') {
      const usedColors = profiles.map((p) => p.color)
      const free = AVATAR_COLORS.find((c) => !usedColors.includes(c))
      setSelectedColor(free || AVATAR_COLORS[profiles.length % AVATAR_COLORS.length])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [mode, profiles])

  const handleSelectProfile = async (profile) => {
    const outgoingId = useAppStore.getState().activeProfile?.id || null
    setActiveProfileId(profile.id)

    await switchSession(outgoingId, profile)

    // Apply profile preferences (only when there was no restored session to override them)
    const store = useAppStore.getState()
    if (profile.preferences?.appTheme) {
      store.setAppTheme(profile.preferences.appTheme)
    }
    if (profile.preferences?.mapStyle) {
      store.setMapStyle(profile.preferences.mapStyle)
    }
    if (profile.layout?.panels) {
      useAppStore.setState((s) => ({
        panels: { ...s.panels, ...profile.layout.panels },
      }))
    }

    markProfilePrompted()
    setShowLoginDialog(false)
    addToast({ type: 'success', message: `Welcome back, ${profile.username}!` })
  }

  const handleCreate = async () => {
    if (!username.trim()) return
    setBusy(true)
    try {
      const outgoingId = useAppStore.getState().activeProfile?.id || null
      const profile = await createProfile({ username, color: selectedColor })
      // Save current settings into the new profile
      const store = useAppStore.getState()
      await saveProfilePreferences(profile.id, { appTheme: store.appTheme, mapStyle: store.mapStyle })
      await saveProfileLayout(profile.id, store.panels)

      setActiveProfileId(profile.id)
      // A brand-new profile has no prior session of its own, but the outgoing
      // guest/profile session should still be stashed rather than discarded.
      await switchSession(outgoingId, profile)
      markProfilePrompted()
      setShowLoginDialog(false)
      addToast({ type: 'success', message: `Profile created! Welcome, ${profile.username}!` })
    } catch (e) {
      addToast({ type: 'error', message: e.message })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id) => {
    const wasActive = useAppStore.getState().activeProfile?.id === id
    await deleteProfile(id)
    if (wasActive) useAppStore.getState().resetAppState()
    const list = await listProfiles()
    setProfiles(list)
    setDeleteConfirm(null)
    if (list.length === 0) setMode('create')
  }

  const handleGuestMode = async () => {
    const outgoingId = useAppStore.getState().activeProfile?.id || null
    clearActiveProfileId()
    await switchSession(outgoingId, null)
    markProfilePrompted()
    setShowLoginDialog(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') handleGuestMode()
  }

  // Optional cloud account — App's adoption flow takes over after the Clerk
  // modal completes (links / selects / creates the local profile).
  const handleClerkSignIn = () => {
    markProfilePrompted()
    setShowLoginDialog(false)
    openSignIn()
  }

  if (mode === 'loading') return null

  return (
    <div className="login-overlay" onClick={handleGuestMode}>
      <div className="login-dialog" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <IconMap size={28} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div>
            <h2 className="login-title">ReadyMapGo</h2>
            <p className="login-subtitle">
              {mode === 'create' && profiles.length === 0
                ? 'Create a profile to save your settings & layout'
                : mode === 'create'
                ? 'Add a new profile'
                : 'Choose your profile'}
            </p>
          </div>
          <button
            className="login-close-btn"
            onClick={handleGuestMode}
            aria-label="Continue as guest"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Profile list */}
        {mode === 'list' && (
          <>
            <div className="login-profile-list">
              {profiles.map((profile) => (
                <div key={profile.id} className="login-profile-row">
                  {deleteConfirm === profile.id ? (
                    <div className="login-delete-confirm">
                      <span>Delete "{profile.username}"?</span>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(profile.id)}>Delete</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="login-profile-card"
                        onClick={() => handleSelectProfile(profile)}
                      >
                        <div
                          className="profile-avatar profile-avatar-lg"
                          style={{ background: profile.color }}
                        >
                          {getInitials(profile.username)}
                        </div>
                        <div className="login-profile-info">
                          <span className="login-profile-name">{profile.username}</span>
                          <span className="login-profile-date">
                            Created {new Date(profile.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <IconCheck size={16} className="login-profile-check" />
                      </button>
                      <button
                        className="btn btn-icon btn-ghost login-profile-delete"
                        aria-label="Delete profile"
                        onClick={() => setDeleteConfirm(profile.id)}
                      >
                        <IconTrash size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="login-divider" />

            <button
              className="btn btn-ghost login-add-profile-btn"
              onClick={() => setMode('create')}
            >
              <IconPlus size={16} /> Add Profile
            </button>
          </>
        )}

        {/* Create profile form */}
        {mode === 'create' && (
          <div className="login-create-form">
            <label className="login-field-label">Username</label>
            <input
              ref={inputRef}
              className="input"
              style={{ width: '100%' }}
              placeholder="Enter your name…"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={32}
              autoComplete="off"
            />

            <label className="login-field-label" style={{ marginTop: 16 }}>Avatar Color</label>
            <div className="login-color-picker">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  className={`login-color-swatch${selectedColor === color ? ' selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={color}
                >
                  {selectedColor === color && <IconCheck size={12} style={{ color: '#fff' }} />}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="login-avatar-preview">
              <div
                className="profile-avatar profile-avatar-lg"
                style={{ background: selectedColor }}
              >
                {username ? getInitials(username) : <IconUser size={20} />}
              </div>
              <span className="login-preview-name">{username || 'Your Name'}</span>
            </div>

            <div className="login-form-actions">
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleCreate}
                disabled={!username.trim() || busy}
              >
                {busy ? 'Creating…' : 'Create Profile'}
              </button>
              {profiles.length > 0 && (
                <button
                  className="btn btn-ghost"
                  onClick={() => setMode('list')}
                >
                  Back
                </button>
              )}
            </div>
          </div>
        )}

        {/* Optional cloud account (hidden if already signed in with one) */}
        {!isSignedIn && (
          <>
            <div className="login-divider" />
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', gap: 8, fontSize: 13 }}
              onClick={handleClerkSignIn}
            >
              <IconCloud size={16} /> Sign in with an account
            </button>
            <span className="login-footer-note" style={{ display: 'block', textAlign: 'center', marginTop: 6 }}>
              Optional — only needed for Pro features across devices
            </span>
          </>
        )}

        {/* Guest mode footer */}
        <div className="login-footer">
          <button className="btn-link login-guest-btn" onClick={handleGuestMode}>
            <IconLogout size={14} />
            Continue as Guest
          </button>
          <span className="login-footer-note">
            Profiles are stored locally on this device
          </span>
        </div>
      </div>
    </div>
  )
}
