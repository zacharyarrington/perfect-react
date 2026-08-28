// UserBadge — top-bar entry point for the current user: avatar, role,
// settings/shortcuts shortcuts, switch user, sign out.

import { useState, useRef, useEffect } from 'react'
import useAppStore from '../store/useAppStore'
import useAuth from '../auth/useAuth'
import { ROLES } from '../config/roles.config'
import {
  IconUserCircle, IconLogout, IconUsers, IconSettings, IconKeyboard,
} from '@tabler/icons-react'

function getInitials(name = '') {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

function getFirstName(name = '') {
  return name.trim().split(/\s+/)[0] || name
}

export default function UserBadge() {
  const { togglePanel, setShowLoginDialog } = useAppStore()
  const { user, roleLabel, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!user) {
    return (
      <button
        className="btn btn-ghost profile-signin-btn"
        data-tooltip="Sign in to save your settings"
        onClick={() => setShowLoginDialog(true)}
      >
        <IconUserCircle size={18} />
        <span className="profile-signin-text">Sign In</span>
      </button>
    )
  }

  const item = (icon, label, onClick, className = '') => (
    <button className={`profile-dropdown-item ${className}`} onClick={() => { setOpen(false); onClick() }}>
      {icon} {label}
    </button>
  )

  return (
    <div className="profile-badge-wrapper" ref={ref}>
      <button
        className={`profile-badge-btn${open ? ' active' : ''}`}
        data-tooltip={`${user.username} · ${roleLabel}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={`User: ${user.username}`}
      >
        <div className="profile-avatar" style={{ background: user.color }}>
          {getInitials(user.username)}
        </div>
        <span className="profile-badge-name">{getFirstName(user.username)}</span>
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-header">
            <div className="profile-avatar profile-avatar-lg" style={{ background: user.color }}>
              {getInitials(user.username)}
            </div>
            <div>
              <div className="profile-dropdown-name">{user.username}</div>
              <div className="profile-dropdown-sub">
                <span className={`badge ${ROLES[user.role]?.badge || ''}`}>{roleLabel}</span>
              </div>
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          {item(<IconUsers size={14} />, 'Switch User', () => setShowLoginDialog(true))}
          {item(<IconSettings size={14} />, 'Settings', () => togglePanel('settings'))}
          {item(<IconKeyboard size={14} />, 'Keyboard Shortcuts', () => togglePanel('keybindings'))}

          <div className="profile-dropdown-divider" />

          {item(<IconLogout size={14} />, 'Sign Out', signOut, 'profile-dropdown-signout')}
        </div>
      )}
    </div>
  )
}
