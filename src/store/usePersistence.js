// usePersistence — restores the session on mount and auto-saves layout,
// theme, and sidebar state as they change. Signed-in users persist onto
// their user record; guests persist to a shared local key.

import { useEffect, useRef } from 'react'
import localforage from 'localforage'
import useAppStore from './useAppStore'
import {
  getActiveUser, getActiveUserId,
  saveUserPreferences, saveUserLayout,
} from '../auth/userManager'

const GUEST_STATE_KEY = 'appshell_guest_state'
const SAVE_DEBOUNCE_MS = 1500

function getContentSize() {
  const el = document.querySelector('.page-container')
  if (!el) return { w: window.innerWidth, h: window.innerHeight }
  const rect = el.getBoundingClientRect()
  return { w: rect.width || window.innerWidth, h: rect.height || window.innerHeight }
}

export default function usePersistence() {
  const panels = useAppStore((s) => s.panels)
  const theme = useAppStore((s) => s.theme)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const saveTimer = useRef(null)
  const restored = useRef(false)

  const savePrefsNow = () => {
    const s = useAppStore.getState()
    const id = getActiveUserId()
    if (id) {
      saveUserPreferences(id, { theme: s.theme, sidebarCollapsed: s.sidebarCollapsed }).catch(() => {})
    } else {
      localforage.setItem(GUEST_STATE_KEY, {
        theme: s.theme,
        sidebarCollapsed: s.sidebarCollapsed,
        panels: s.panels,
      }).catch(() => {})
    }
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
        if (user.layout?.panels) {
          useAppStore.setState((s) => ({ panels: { ...s.panels, ...user.layout.panels } }))
        }
      } else {
        const guest = await localforage.getItem(GUEST_STATE_KEY)
        if (guest) {
          if (guest.theme) store.setTheme(guest.theme)
          if (guest.sidebarCollapsed != null) store.setSidebarCollapsed(guest.sidebarCollapsed)
          if (guest.panels) {
            useAppStore.setState((s) => ({ panels: { ...s.panels, ...guest.panels } }))
          }
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
  }, [theme, sidebarCollapsed])

  // ── Panels: debounced auto-save ───────────────────────────────────────────
  // Dragging/resizing fires many updates per second, so this one is worth
  // debouncing. flush on unmount/navigation-away so an in-flight drag is
  // never lost if the tab closes during the debounce window.
  useEffect(() => {
    if (!restored.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const s = useAppStore.getState()
      const id = getActiveUserId()
      if (id) saveUserLayout(id, s.panels).catch(() => {})
      else savePrefsNow() // guest state is one blob; keep panels in sync with it too
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(saveTimer.current)
  }, [panels])

  // Flush any pending panel-layout save immediately when the page is about
  // to unload, so a drag right before closing the tab isn't silently lost.
  useEffect(() => {
    const flush = () => {
      if (!saveTimer.current) return
      clearTimeout(saveTimer.current)
      const s = useAppStore.getState()
      const id = getActiveUserId()
      if (id) saveUserLayout(id, s.panels).catch(() => {})
      else savePrefsNow()
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])
}
