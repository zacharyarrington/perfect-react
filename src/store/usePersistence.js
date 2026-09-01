// usePersistence — restores the session on mount and auto-saves layout,
// theme, and sidebar state as they change. Signed-in users persist onto
// their user record; guests persist to a shared local key.
//
// Panel layout saves are debounced through localforage (IndexedDB), which
// is async — a pagehide handler alone can't guarantee that write finishes
// before the document unloads (see dashboardStorage.js for the reproduced
// case: a reload inside the debounce window silently drops the change).
// The debounced/flush paths below also mirror the panels blob to
// localStorage synchronously, and restore() prefers it when it's newer
// than what made it into localforage.

import { useEffect, useRef } from 'react'
import localforage from 'localforage'
import useAppStore from './useAppStore'
import {
  getActiveUser, getActiveUserId,
  saveUserPreferences, saveUserLayout,
} from '../auth/userManager'

const GUEST_STATE_KEY = 'appshell_guest_state'
const GUEST_STATE_SYNC_KEY = 'appshell_guest_state_sync'
const SAVE_DEBOUNCE_MS = 1500

function mirrorPanelsToLocalStorageSync(panels) {
  try {
    localStorage.setItem(GUEST_STATE_SYNC_KEY, JSON.stringify({ panels, savedAt: Date.now() }))
  } catch {
    // best-effort only
  }
}

function getContentSize() {
  const el = document.querySelector('.page-container')
  if (!el) return { w: window.innerWidth, h: window.innerHeight }
  const rect = el.getBoundingClientRect()
  return { w: rect.width || window.innerWidth, h: rect.height || window.innerHeight }
}

// Merge saved panels onto the current (registry-derived) defaults per key,
// not by replacing the whole panels object — a saved entry from before a
// field like `docked`/`dockOrder` existed must not wipe out the fresh
// default for that field just because the key itself was already saved.
export function mergePanels(current, saved) {
  if (!saved) return current
  return Object.fromEntries(
    Object.keys(current).map((k) => [k, { ...current[k], ...saved[k] }])
  )
}

export default function usePersistence() {
  const panels = useAppStore((s) => s.panels)
  const theme = useAppStore((s) => s.theme)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const dock = useAppStore((s) => s.dock)
  const saveTimer = useRef(null)
  const restored = useRef(false)

  const savePrefsNow = () => {
    const s = useAppStore.getState()
    const id = getActiveUserId()
    s.reportSaving()
    const write = id
      ? saveUserPreferences(id, { theme: s.theme, sidebarCollapsed: s.sidebarCollapsed, dock: s.dock })
      : (mirrorPanelsToLocalStorageSync(s.panels),
         localforage.setItem(GUEST_STATE_KEY, {
           theme: s.theme, sidebarCollapsed: s.sidebarCollapsed, dock: s.dock, panels: s.panels,
         }))
    write.then(() => useAppStore.getState().reportSaved())
      .catch(() => useAppStore.getState().reportSaveError())
  }

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const store = useAppStore.getState()
      const user = await getActiveUser()

      if (user) {
        store.setCurrentUser(user)
        if (user.preferences?.theme) store.setTheme(user.preferences.theme)
        if (user.preferences?.sidebarCollapsed != null) {
          store.setSidebarCollapsed(user.preferences.sidebarCollapsed)
        }
        if (user.preferences?.dock) {
          useAppStore.setState((s) => ({ dock: { ...s.dock, ...user.preferences.dock } }))
        }
        if (user.layout?.panels) {
          useAppStore.setState((s) => ({ panels: mergePanels(s.panels, user.layout.panels) }))
        }
      } else {
        const guest = await localforage.getItem(GUEST_STATE_KEY)

        // The localStorage mirror can be ahead of the localforage copy if a
        // previous tab closed/reloaded before its debounced panels write
        // landed — prefer the mirror's panels in that case.
        let panelsMirror = null
        try {
          const raw = localStorage.getItem(GUEST_STATE_SYNC_KEY)
          if (raw) panelsMirror = JSON.parse(raw)
        } catch {
          // corrupt/unavailable mirror — fall back to the localforage copy
        }

        if (guest) {
          if (guest.theme) store.setTheme(guest.theme)
          if (guest.sidebarCollapsed != null) store.setSidebarCollapsed(guest.sidebarCollapsed)
          if (guest.dock) useAppStore.setState((s) => ({ dock: { ...s.dock, ...guest.dock } }))
        }
        const resolvedPanels = panelsMirror?.panels || guest?.panels
        if (resolvedPanels) {
          useAppStore.setState((s) => ({ panels: mergePanels(s.panels, resolvedPanels) }))
        }
      }

      restored.current = true
      // Clamp after the DOM has rendered so we can measure the content area
      requestAnimationFrame(() => {
        const { w, h } = getContentSize()
        useAppStore.getState().clampPanels(w, h)
      })
    }
    restore()
  }, [])

  // ── Theme / sidebar: save immediately ─────────────────────────────────────
  // These change rarely (a click or keypress) and are cheap to write, so
  // there's no reason to debounce them — doing so left a window where a
  // quick refresh right after switching themes would lose the change and
  // silently fall back to the default.
  useEffect(() => {
    if (!restored.current) return
    savePrefsNow()
  }, [theme, sidebarCollapsed, dock])

  // ── Panels: debounced auto-save ───────────────────────────────────────────
  // Dragging/resizing fires many updates per second, so this one is worth
  // debouncing. flush on unmount/navigation-away so an in-flight drag is
  // never lost if the tab closes during the debounce window.
  useEffect(() => {
    if (!restored.current) return
    // Mirror synchronously right away — cheap, and it's the copy that
    // survives an unload before the debounce timer (or its async localforage
    // write) gets to run.
    if (!getActiveUserId()) mirrorPanelsToLocalStorageSync(panels)
    useAppStore.getState().reportSaving()
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const s = useAppStore.getState()
      const id = getActiveUserId()
      if (id) {
        saveUserLayout(id, s.panels)
          .then(() => useAppStore.getState().reportSaved())
          .catch(() => useAppStore.getState().reportSaveError())
      } else savePrefsNow() // guest state is one blob; keep panels in sync with it too
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(saveTimer.current)
  }, [panels])

  // Flush any pending panel-layout save immediately when the page is about
  // to unload, so a drag right before closing the tab isn't silently lost.
  // visibilitychange (tab backgrounded/closed) fires before any document
  // teardown, so async work it starts is far more likely to actually finish
  // than the same work started from pagehide — flush on both.
  useEffect(() => {
    const flush = () => {
      if (!saveTimer.current) return
      clearTimeout(saveTimer.current)
      const s = useAppStore.getState()
      const id = getActiveUserId()
      if (id) {
        saveUserLayout(id, s.panels)
          .then(() => useAppStore.getState().reportSaved())
          .catch(() => useAppStore.getState().reportSaveError())
      } else savePrefsNow()
    }
    const flushIfHidden = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flushIfHidden)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flushIfHidden)
    }
  }, [])
}
