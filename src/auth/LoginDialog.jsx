// LoginDialog — local user selection / creation.
// The first user ever created is promoted to Administrator automatically;
// later self-created users get APP_CONFIG.defaultRole until an admin
// promotes them from the Users page.

import { useState, useEffect, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import APP_CONFIG from '../config/app.config'
import { ROLES } from '../config/roles.config'
import { logAction } from '../audit/auditStore'
import {
  listUsers, createUser, deleteUser,
  setActiveUserId, clearActiveUserId,
  markLoginPrompted, AVATAR_COLORS,
  saveUserPreferences, saveUserLayout,
} from './userManager'

import {
  IconPlus, IconTrash, IconLogout, IconCheck, IconX, IconUser,
} from '@tabler/icons-react'

function getInitials(name = '') {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

export default function LoginDialog() {
  const { setCurrentUser, setShowLoginDialog, addToast } = useAppStore()

  const [users, setUsers]                 = useState([])
  const [mode, setMode]                   = useState('loading')  // loading | list | create
  const [username, setUsername]           = useState('')
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0])
  const [busy, setBusy]                   = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)       // user id pending delete
  const inputRef = useRef(null)

  useEffect(() => {
    listUsers().then((list) => {
      setUsers(list)
      setMode(list.length === 0 ? 'create' : 'list')
    })
  }, [])

  // Auto-pick a color not yet used
  useEffect(() => {
    if (mode === 'create') {
      const usedColors = users.map((u) => u.color)
      const free = AVATAR_COLORS.find((c) => !usedColors.includes(c))
      setSelectedColor(free || AVATAR_COLORS[users.length % AVATAR_COLORS.length])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [mode, users])

  const applyUserPreferences = (user) => {
    const store = useAppStore.getState()
    if (user.preferences?.theme) store.setTheme(user.preferences.theme)
    if (user.preferences?.sidebarCollapsed != null) {
      store.setSidebarCollapsed(user.preferences.sidebarCollapsed)
    }
    if (user.preferences?.dock) {
      useAppStore.setState((s) => ({ dock: { ...s.dock, ...user.preferences.dock } }))
    }
    if (user.layout?.panels) {
      // Merge per-key, not by replacing the whole panels object — a saved
      // entry from before a field like docked/dockOrder existed must not
      // wipe out the fresh default for that field (see usePersistence.js).
      useAppStore.setState((s) => ({
        panels: Object.fromEntries(
          Object.keys(s.panels).map((k) => [k, { ...s.panels[k], ...user.layout.panels[k] }])
        ),
      }))
    }
  }

  const handleSelectUser = (user) => {
    setActiveUserId(user.id)
    setCurrentUser(user)
    applyUserPreferences(user)
    markLoginPrompted()
    setShowLoginDialog(false)
    // Active user is already switched above, so this logs under the
    // now-signed-in user, same as they'd expect to see themselves.
    logAction({ action: 'signed_in', target: user.username })
    addToast({ type: 'success', message: `Welcome back, ${user.username}!` })
  }

  const handleCreate = async () => {
    if (!username.trim()) return
    setBusy(true)
    try {
      const user = await createUser({ username, color: selectedColor })
      // Save current settings into the new user
      const store = useAppStore.getState()
      await saveUserPreferences(user.id, {
        theme: store.theme,
        sidebarCollapsed: store.sidebarCollapsed,
      })
      await saveUserLayout(user.id, store.panels)

      setActiveUserId(user.id)
      setCurrentUser(user)
      markLoginPrompted()
      setShowLoginDialog(false)
      logAction({ action: 'user.created', target: user.username, meta: { role: user.role } })
      logAction({ action: 'signed_in', target: user.username })
      addToast({
        type: 'success',
        message: user.role === 'admin'
          ? `Welcome, ${user.username}! You're the administrator.`
          : `Welcome, ${user.username}!`,
      })
    } catch (e) {
      addToast({ type: 'error', message: e.message })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id) => {
    const wasActive = useAppStore.getState().currentUser?.id === id
    await deleteUser(id)
    if (wasActive) useAppStore.getState().resetAppState()
    const list = await listUsers()
    setUsers(list)
    setDeleteConfirm(null)
    if (list.length === 0) setMode('create')
  }

  const handleGuestMode = () => {
    if (!APP_CONFIG.allowGuest) return
    clearActiveUserId()
    markLoginPrompted()
    setShowLoginDialog(false)
  }

  const handleClose = () => {
    // Closing without choosing = guest mode when allowed, otherwise stay open
    if (APP_CONFIG.allowGuest) handleGuestMode()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') handleClose()
  }

  if (mode === 'loading') return null

  return (
    <div className="login-overlay" onClick={handleClose}>
      <div className="login-dialog" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <span style={{ color: 'var(--accent-primary)', display: 'flex' }}>
              {APP_CONFIG.logo}
            </span>
          </div>
          <div>
            <h2 className="login-title">{APP_CONFIG.name}</h2>
            <p className="login-subtitle">
              {mode === 'create' && users.length === 0
                ? 'Create the first user — they become the administrator'
                : mode === 'create'
                ? 'Add a new user'
                : 'Choose your user'}
            </p>
          </div>
          {APP_CONFIG.allowGuest && (
            <button className="login-close-btn" onClick={handleClose} aria-label="Continue as guest">
              <IconX size={18} />
            </button>
          )}
        </div>

        {/* User list */}
        {mode === 'list' && (
          <>
            <div className="login-profile-list">
              {users.map((user) => (
                <div key={user.id} className="login-profile-row">
                  {deleteConfirm === user.id ? (
                    <div className="login-delete-confirm">
                      <span>Delete "{user.username}"?</span>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user.id)}>Delete</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button className="login-profile-card" onClick={() => handleSelectUser(user)}>
                        <div
                          className="profile-avatar profile-avatar-lg"
                          style={{ background: user.color }}
                        >
                          {getInitials(user.username)}
                        </div>
                        <div className="login-profile-info">
                          <span className="login-profile-name">{user.username}</span>
                          <span className="login-profile-date">
                            {ROLES[user.role]?.label || user.role}
                          </span>
                        </div>
                        <IconCheck size={16} className="login-profile-check" />
                      </button>
                      <button
                        className="btn btn-icon btn-ghost login-profile-delete"
                        aria-label="Delete user"
                        onClick={() => setDeleteConfirm(user.id)}
                      >
                        <IconTrash size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="login-divider" />

            <button className="btn btn-ghost login-add-profile-btn" onClick={() => setMode('create')}>
              <IconPlus size={16} /> Add User
            </button>
          </>
        )}

        {/* Create user form */}
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
              <div className="profile-avatar profile-avatar-lg" style={{ background: selectedColor }}>
                {username ? getInitials(username) : <IconUser size={20} />}
              </div>
              <span className="login-preview-name">{username || 'Your Name'}</span>
              <span className={`badge ${ROLES[users.length === 0 ? 'admin' : APP_CONFIG.defaultRole]?.badge || ''}`} style={{ marginLeft: 'auto' }}>
                {ROLES[users.length === 0 ? 'admin' : APP_CONFIG.defaultRole]?.label}
              </span>
            </div>

            <div className="login-form-actions">
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleCreate}
                disabled={!username.trim() || busy}
              >
                {busy ? 'Creating…' : 'Create User'}
              </button>
              {users.length > 0 && (
                <button className="btn btn-ghost" onClick={() => setMode('list')}>
                  Back
                </button>
              )}
            </div>
          </div>
        )}

        {/* Guest mode footer */}
        <div className="login-footer">
          {APP_CONFIG.allowGuest ? (
            <button className="btn-link login-guest-btn" onClick={handleGuestMode}>
              <IconLogout size={14} />
              Continue as Guest
            </button>
          ) : <span />}
          <span className="login-footer-note">
            Users are stored locally on this device
          </span>
        </div>
      </div>
    </div>
  )
}
