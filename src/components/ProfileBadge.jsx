import { useState, useRef, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import useAppStore from '../store/useAppStore'
import { clearActiveProfileId } from '../storage/profileManager'
import { switchSession } from '../storage/sessionSwitch'
import AboutDialog from './AboutDialog'
import DonateDialog from './DonateDialog'
import {
  IconUserCircle, IconLogout, IconUsers, IconSettings, IconKeyboard,
  IconClipboardList, IconInfoCircle, IconHeart, IconCloud,
} from '@tabler/icons-react'

function getInitials(name = '') {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

function getFirstName(name = '') {
  return name.trim().split(/\s+/)[0] || name
}

export default function ProfileBadge() {
  const { activeProfile, setShowLoginDialog, togglePanel, addToast } = useAppStore()
  const { isSignedIn, user } = useUser()
  const { signOut, openUserProfile, openSignIn } = useClerk()
  const [open, setOpen] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showDonate, setShowDonate] = useState(false)
  const ref = useRef(null)

  // The active profile is "linked" when it belongs to the signed-in Clerk account
  const linked = Boolean(isSignedIn && user && activeProfile?.clerkUserId === user.id)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSignOut = async () => {
    const outgoingId = activeProfile?.id || null
    clearActiveProfileId()
    setOpen(false)
    await switchSession(outgoingId, null)
    // Signing out of a linked profile signs out of the Clerk account too —
    // otherwise the adoption flow would immediately pick the profile back up.
    if (linked) await signOut().catch(() => {})
    addToast({ type: 'info', message: 'Signed out — continuing as guest' })
  }

  const handleManageAccount = () => {
    setOpen(false)
    openUserProfile()
  }

  const handleConnectAccount = () => {
    setOpen(false)
    openSignIn()
  }

  const handleSwitchProfile = () => {
    setOpen(false)
    setShowLoginDialog(true)
  }

  const handleOpenSettings = () => {
    setOpen(false)
    togglePanel('settings')
  }

  const handleOpenKeybindings = () => {
    setOpen(false)
    togglePanel('keybindings')
  }

  const handleOpenLog = () => {
    setOpen(false)
    togglePanel('gislog')
  }

  if (!activeProfile) {
    return (
      <>
        <button
          className="btn btn-icon"
          data-tooltip="About ReadyMapGo"
          onClick={() => setShowAbout(true)}
        >
          <IconInfoCircle size={18} />
        </button>
        <button
          className="btn btn-icon"
          data-tooltip="Support ReadyMapGo"
          onClick={() => setShowDonate(true)}
        >
          <IconHeart size={18} />
        </button>
        <button
          className="btn btn-icon"
          data-tooltip="Keyboard shortcuts"
          onClick={() => togglePanel('keybindings')}
        >
          <IconKeyboard size={18} />
        </button>
        <button
          className="btn btn-ghost profile-signin-btn"
          data-tooltip="Sign in to save your settings"
          onClick={() => setShowLoginDialog(true)}
        >
          <IconUserCircle size={18} />
          <span className="profile-signin-text">Sign In</span>
        </button>
        {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
        {showDonate && <DonateDialog onClose={() => setShowDonate(false)} />}
      </>
    )
  }

  return (
    <div className="profile-badge-wrapper" ref={ref}>
      <button
        className={`profile-badge-btn${open ? ' active' : ''}`}
        data-tooltip={activeProfile.username}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Profile: ${activeProfile.username}`}
      >
        <div
          className="profile-avatar"
          style={{ background: activeProfile.color }}
        >
          {getInitials(activeProfile.username)}
        </div>
        <span className="profile-badge-name">{getFirstName(activeProfile.username)}</span>
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-header">
            <div
              className="profile-avatar profile-avatar-lg"
              style={{ background: activeProfile.color }}
            >
              {getInitials(activeProfile.username)}
            </div>
            <div>
              <div className="profile-dropdown-name">{activeProfile.username}</div>
              <div className="profile-dropdown-sub">
                {linked
                  ? (user?.primaryEmailAddress?.emailAddress || 'Connected account')
                  : 'Local Profile'}
              </div>
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          {linked ? (
            <button className="profile-dropdown-item" onClick={handleManageAccount}>
              <IconCloud size={14} /> Manage Account
            </button>
          ) : (
            <button className="profile-dropdown-item" onClick={handleConnectAccount}>
              <IconCloud size={14} /> Connect Account
            </button>
          )}
          <button className="profile-dropdown-item" onClick={handleSwitchProfile}>
            <IconUsers size={14} /> Switch Profile
          </button>
          <button className="profile-dropdown-item" onClick={handleOpenSettings}>
            <IconSettings size={14} /> Settings
          </button>
          <button className="profile-dropdown-item" onClick={handleOpenKeybindings}>
            <IconKeyboard size={14} /> Keyboard Shortcuts
          </button>
          <div className="profile-dropdown-divider" />
          <button className="profile-dropdown-item" onClick={handleOpenLog}>
            <IconClipboardList size={14} /> GIS Log
          </button>

          <div className="profile-dropdown-divider" />

          <button className="profile-dropdown-item" onClick={() => { setOpen(false); setShowAbout(true) }}>
            <IconInfoCircle size={14} /> About ReadyMapGo
          </button>
          <button className="profile-dropdown-item" onClick={() => { setOpen(false); setShowDonate(true) }}>
            <IconHeart size={14} /> Support ReadyMapGo
          </button>

          <div className="profile-dropdown-divider" />

          <button className="profile-dropdown-item profile-dropdown-signout" onClick={handleSignOut}>
            <IconLogout size={14} /> Sign Out
          </button>
        </div>
      )}

      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      {showDonate && <DonateDialog onClose={() => setShowDonate(false)} />}
    </div>
  )
}
