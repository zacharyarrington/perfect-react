import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import './styles/index.css'
import TopBar         from './components/TopBar'
import MapView        from './map/MapView'
import PanelManager   from './panels/PanelManager'
import Toast          from './components/Toast'
import LoginDialog    from './components/LoginDialog'
import WelcomeModal   from './components/WelcomeModal'
import WorkflowView   from './workflow/WorkflowView'
import usePersistence from './store/usePersistence'
import useAppStore    from './store/useAppStore'
import { isLightStyle } from './map/mapStyles'
import {
  isFirstProfilePrompt, updateProfile, syncTierFromSupabase,
  createProfile, setActiveProfileId, AVATAR_COLORS,
  listProfiles, saveProfilePreferences, saveProfileLayout, markProfilePrompted,
} from './storage/profileManager'
import { switchSession } from './storage/sessionSwitch'
import { saveProject } from './storage/projectManager'
import { startTour } from './tour/useTour'

const PANEL_KEYS = ['layers', 'attributes', 'gistools', 'filters', 'search', 'dashboard']

// Module-level so React StrictMode's double effect run can't trip the
// first-visit check twice (see the welcome effect below).
let welcomeCheckRan = false

export default function App() {
  usePersistence()

  const { addToast, mapStyle, clampPanels, appTheme, showLoginDialog, setShowLoginDialog, activeProfile, closePanel, workflowOpen } = useAppStore()
  const [showWelcome, setShowWelcome] = useState(false)
  const mapTheme = isLightStyle(mapStyle) ? 'light' : 'dark'

  // Clerk adoption — runs once per Clerk sign-in (not on every profile change,
  // so switching local profiles later never silently re-links them):
  //   1. a local profile is active → link it (clerkUserId is the Supabase key)
  //   2. a profile on this device is already linked to this account → switch to it
  //   3. otherwise → create a local profile from the Clerk identity so nobody
  //      has to sign in twice
  // Local profiles stay the source of truth for name/color/layout; the Clerk
  // account is optional and only used to look up the paid tier.
  const { isSignedIn, user } = useUser()
  const adoptedClerkUser = useRef(null)
  useEffect(() => {
    if (!isSignedIn || !user) {
      adoptedClerkUser.current = null
      return
    }
    if (adoptedClerkUser.current === user.id) return
    adoptedClerkUser.current = user.id

    const adopt = async () => {
      const store = useAppStore.getState()
      const current = store.activeProfile

      if (current) {
        if (current.clerkUserId !== user.id) {
          const updated = await updateProfile(current.id, { clerkUserId: user.id })
          useAppStore.getState().setActiveProfile(updated)
          addToast({ type: 'success', message: 'Account connected to your profile' })
        }
        return
      }

      const profiles = await listProfiles()
      const existing = profiles.find((p) => p.clerkUserId === user.id)
      if (existing) {
        setActiveProfileId(existing.id)
        await switchSession(null, existing)
        markProfilePrompted()
        addToast({ type: 'success', message: `Welcome back, ${existing.username}!` })
        return
      }

      const username = user.firstName || user.fullName || user.primaryEmailAddress?.emailAddress || 'User'
      const usedColors = profiles.map((p) => p.color)
      const color = AVATAR_COLORS.find((c) => !usedColors.includes(c))
        || AVATAR_COLORS[profiles.length % AVATAR_COLORS.length]
      let profile = await createProfile({ username, color })
      await saveProfilePreferences(profile.id, { appTheme: store.appTheme, mapStyle: store.mapStyle })
      await saveProfileLayout(profile.id, store.panels)
      profile = await updateProfile(profile.id, { clerkUserId: user.id })
      setActiveProfileId(profile.id)
      await switchSession(null, profile)
      markProfilePrompted()
      addToast({ type: 'success', message: `Welcome, ${profile.username}!` })
    }
    adopt().catch(() => {})
  }, [isSignedIn, user]) // eslint-disable-line

  // Pull the latest tier/subscription status from Supabase and cache it onto
  // the local profile, so feature gating can read activeProfile.tier locally.
  // Re-runs on every load/link so a Stripe upgrade shows up on next visit.
  useEffect(() => {
    if (!activeProfile?.clerkUserId) return
    syncTierFromSupabase(activeProfile.id, activeProfile.clerkUserId)
      .then((updated) => updated && useAppStore.getState().setActiveProfile(updated))
      .catch(() => {})
  }, [activeProfile?.id, activeProfile?.clerkUserId]) // eslint-disable-line

  // Resolved UI theme: manual override wins, otherwise follow the basemap
  const resolvedTheme = appTheme === 'auto' ? mapTheme : appTheme

  const mapContainerRef = useRef(null)

  // Apply theme attribute to <html> so CSS variables cascade everywhere
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  // Clamp panel positions whenever the map container resizes
  useEffect(() => {
    const el = mapContainerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        clampPanels(width, height)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [clampPanels])

  // First-visit: show the welcome modal with all panels closed.
  // Subsequent visits: show profile prompt only if still no profile.
  useEffect(() => {
    // StrictMode runs this twice in dev; without the guard the second run
    // sees the sessionStorage flag the first run just set and shows the
    // login dialog instead of the welcome modal.
    if (welcomeCheckRan) return
    welcomeCheckRan = true
    const hasVisited = sessionStorage.getItem('rmg_welcomed')
    if (!hasVisited) {
      sessionStorage.setItem('rmg_welcomed', '1')
      // Wait for persistence (loadAutoSave + loadPanelState) to finish before
      // closing panels — both are async/RAF so a single rAF + microtask flush
      // after a short timeout ensures we run last.
      // No cleanup: StrictMode's dev remount would cancel the timer and the
      // guard above prevents rescheduling. App never unmounts in practice.
      setTimeout(() => {
        const allPanelKeys = Object.keys(useAppStore.getState().panels)
        allPanelKeys.forEach((k) => useAppStore.getState().closePanel(k))
        setShowWelcome(true)
      }, 1200)
    } else if (!activeProfile && isFirstProfilePrompt()) {
      setTimeout(() => setShowLoginDialog(true), 800)
    }
  }, []) // eslint-disable-line

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable
      const mod = e.ctrlKey || e.metaKey

      // Undo/redo allowed even in inputs (standard browser behaviour)
      if (mod && e.key === 'z' && !e.shiftKey) {
        if (inInput) return
        e.preventDefault()
        useAppStore.getState().undo()
        return
      }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (inInput) return
        e.preventDefault()
        useAppStore.getState().redo()
        return
      }

      if (inInput) return

      const store = useAppStore.getState()

      // Ctrl/Cmd+S → save
      if (mod && e.key === 's') {
        e.preventDefault()
        saveProject(store.project.name)
          .then(() => store.addToast({ type: 'success', message: `Project "${store.project.name}" saved!` }))
          .catch((err) => store.addToast({ type: 'error', message: `Save failed: ${err.message}` }))
        return
      }

      // Ctrl/Cmd+I → import (click the hidden file input in the Layers panel)
      if (mod && e.key === 'i') {
        e.preventDefault()
        document.querySelector('#btn-panel-layers')?.click()
        return
      }

      // Ctrl/Cmd+1–6 → toggle panels
      if (mod && e.key >= '1' && e.key <= '6') {
        e.preventDefault()
        const idx = parseInt(e.key, 10) - 1
        if (PANEL_KEYS[idx]) store.togglePanel(PANEL_KEYS[idx])
        return
      }

      // Escape → hide all open panels (clear the view to focus the map)
      if (e.key === 'Escape' && !mod) {
        const openKeys = Object.entries(store.panels)
          .filter(([, p]) => p.open)
          .map(([k]) => k)
        if (openKeys.length > 0) {
          e.preventDefault()
          openKeys.forEach((k) => store.closePanel(k))
        }
        return
      }

      // Ctrl/Cmd+` → toggle all panels (show if all hidden, hide if any open)
      if (mod && e.key === '`') {
        e.preventDefault()
        const openKeys = Object.entries(store.panels).filter(([, p]) => p.open).map(([k]) => k)
        if (openKeys.length > 0) {
          openKeys.forEach((k) => store.closePanel(k))
        } else {
          PANEL_KEYS.forEach((k) => store.openPanel(k))
        }
        return
      }

      // T → cycle theme (auto → dark → light → auto), only when map is focused
      if (e.key === 't' && !mod) {
        const theme = store.appTheme
        store.setAppTheme(theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto')
        return
      }

      // ? → open keyboard shortcuts panel
      if (e.key === '?' && !mod) {
        useAppStore.getState().togglePanel('keybindings')
        return
      }

      // Delete/Backspace → delete the active layer (with confirmation)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
        const { activeLayerId, layers, removeLayer, addToast } = useAppStore.getState()
        if (!activeLayerId) return
        const layer = layers.find((l) => l.id === activeLayerId)
        if (!layer) return
        if (window.confirm(`Remove layer "${layer.name}"?`)) {
          removeLayer(activeLayerId)
          addToast({ type: 'info', message: `Deleted layer "${layer.name}"` })
        }
        return
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, []) // eslint-disable-line

  return (
    <div className="app-container">
      <TopBar />
      <div ref={mapContainerRef} style={{ position: 'relative', flex: 1 }} data-map-theme={resolvedTheme}>
        {/* Map is always mounted so layers/state persist when switching to workflow view */}
        <div style={{ position: 'absolute', inset: 0, visibility: workflowOpen ? 'hidden' : 'visible' }}>
          <MapView />
          <PanelManager />
        </div>
        <WorkflowView />
      </div>
      <Toast />
      {showLoginDialog && <LoginDialog />}
      {showWelcome && (
        <WelcomeModal
          onStartTour={() => {
            setShowWelcome(false)
            setTimeout(() => startTour(), 100)
          }}
          onDismiss={() => setShowWelcome(false)}
        />
      )}
    </div>
  )
}
