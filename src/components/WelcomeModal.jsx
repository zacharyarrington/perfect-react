import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useClerk } from '@clerk/clerk-react'
import { IconMap, IconCompass, IconUser, IconLogout, IconCloud } from '@tabler/icons-react'
import useAppStore from '../store/useAppStore'
import { listProfiles, markProfilePrompted, AVATAR_COLORS, createProfile, setActiveProfileId } from '../storage/profileManager'
import { saveProfilePreferences, saveProfileLayout } from '../storage/profileManager'

// The welcome modal shown to brand-new visitors.
// Two paths: start the tour, or go straight to profile setup / guest mode.
export default function WelcomeModal({ onStartTour, onDismiss }) {
  const [screen, setScreen] = useState('welcome') // 'welcome' | 'profile'
  const [username, setUsername] = useState('')
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0])
  const [busy, setBusy] = useState(false)
  const { setActiveProfile, setShowLoginDialog, addToast } = useAppStore()

  // Auto-pick an unused color
  useEffect(() => {
    listProfiles().then((list) => {
      const usedColors = list.map((p) => p.color)
      const free = AVATAR_COLORS.find((c) => !usedColors.includes(c))
      setSelectedColor(free || AVATAR_COLORS[0])
    })
  }, [])

  const handleCreateProfile = async () => {
    if (!username.trim()) return
    setBusy(true)
    try {
      const store = useAppStore.getState()
      const profile = await createProfile({ username: username.trim(), color: selectedColor })
      await saveProfilePreferences(profile.id, { appTheme: store.appTheme, mapStyle: store.mapStyle })
      await saveProfileLayout(profile.id, store.panels)
      setActiveProfileId(profile.id)
      setActiveProfile(profile)
      markProfilePrompted()
      addToast({ type: 'success', message: `Welcome, ${profile.username}!` })
      onDismiss()
    } catch (e) {
      addToast({ type: 'error', message: e.message })
    } finally {
      setBusy(false)
    }
  }

  const { openSignIn } = useClerk()

  const handleGuest = () => {
    markProfilePrompted()
    onDismiss()
  }

  // Optional cloud account — App's adoption flow creates/links the local
  // profile automatically once the Clerk modal completes.
  const handleClerkSignIn = () => {
    markProfilePrompted()
    onDismiss()
    openSignIn()
  }

  const handleTour = () => {
    markProfilePrompted()
    onStartTour()
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          width: 'min(480px, 100%)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {screen === 'welcome' ? (
          <>
            {/* Header */}
            <div style={{ padding: '32px 32px 24px', textAlign: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(0,212,200,0.12)',
                border: '1px solid rgba(0,212,200,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <IconMap size={28} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                Welcome to ReadyMapGo
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                A browser-based GIS platform — import geospatial data, style it, analyze it, and export it, all without leaving your browser.
              </p>
            </div>

            {/* Actions */}
            <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px 20px', fontSize: 14, fontWeight: 600, gap: 10, justifyContent: 'center' }}
                onClick={handleTour}
              >
                <IconCompass size={18} />
                Take the guided tour
              </button>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                ~2 minutes · we'll load sample data and walk you through everything
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>

              <button
                className="btn btn-ghost"
                style={{ width: '100%', padding: '10px 20px', fontSize: 14, gap: 10, justifyContent: 'center' }}
                onClick={() => setScreen('profile')}
              >
                <IconUser size={16} />
                Set up a profile &amp; dive in
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Profile setup */}
            <div style={{ padding: '24px 32px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 20 }}>
              <button
                onClick={() => setScreen('welcome')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                ← Back
              </button>
              <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Create a Profile</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                Profiles save your layout and settings locally on this device.
              </p>
            </div>

            <div style={{ padding: '20px 32px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: 6 }}>Username</label>
                <input
                  autoFocus
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Enter your name…"
                  value={username}
                  maxLength={32}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: 8 }}>Avatar Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: color, border: `3px solid ${selectedColor === color ? 'var(--text-primary)' : 'transparent'}`,
                        cursor: 'pointer', padding: 0, transition: 'border-color 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: 14, justifyContent: 'center' }}
                  onClick={handleCreateProfile}
                  disabled={!username.trim() || busy}
                >
                  {busy ? 'Creating…' : 'Create Profile'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>

              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', gap: 8, fontSize: 13 }}
                onClick={handleClerkSignIn}
              >
                <IconCloud size={14} /> Sign in with an account
              </button>
              <p style={{ margin: '-8px 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                Optional — only needed for Pro features across devices
              </p>

              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', gap: 8, fontSize: 13 }}
                onClick={handleGuest}
              >
                <IconLogout size={14} /> Continue as Guest
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
