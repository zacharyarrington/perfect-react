// usePersistence — auto-save hook that wraps projectManager
// Provides a React-friendly interface for persistence operations

import { useEffect, useCallback, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import {
  saveProject,
  loadProject,
  listProjects,
  deleteProject,
  saveAutoSave,
  loadAutoSave,
  savePanelState,
  loadPanelState,
} from '../storage/projectManager'
import {
  getActiveProfile,
  getActiveProfileId,
  saveProfilePreferences,
  saveProfileLayout,
} from '../storage/profileManager'

const AUTO_SAVE_INTERVAL_MS = 30_000

function getMapContainerSize() {
  // The map container is the sibling div below the topbar
  const el = document.querySelector('[data-map-theme]')
  if (!el) return { w: window.innerWidth, h: window.innerHeight }
  const rect = el.getBoundingClientRect()
  return { w: rect.width || window.innerWidth, h: rect.height || window.innerHeight }
}

export default function usePersistence() {
  const { addToast, loadFromSnapshot, project, panels } = useAppStore()
  const profileSaveTimer = useRef(null)

  // ── Auto-save on interval ─────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      saveAutoSave().catch(() => {}) // silent auto-save
    }, AUTO_SAVE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  // ── Persist panel positions whenever they change ──────────────────────────
  useEffect(() => {
    savePanelState()
    // Debounced save to active profile
    const id = getActiveProfileId()
    if (!id) return
    clearTimeout(profileSaveTimer.current)
    profileSaveTimer.current = setTimeout(() => {
      saveProfileLayout(id, useAppStore.getState().panels).catch(() => {})
    }, 2000)
  }, [panels])

  // ── Save profile preferences when theme/mapStyle change ──────────────────
  useEffect(() => {
    return useAppStore.subscribe(
      (s) => ({ appTheme: s.appTheme, mapStyle: s.mapStyle }),
      ({ appTheme, mapStyle }) => {
        const id = getActiveProfileId()
        if (!id) return
        saveProfilePreferences(id, { appTheme, mapStyle }).catch(() => {})
      },
      { equalityFn: (a, b) => a.appTheme === b.appTheme && a.mapStyle === b.mapStyle }
    )
  }, [])

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    // Load the active profile first — autosave is keyed per-identity, so we
    // need to know who's signed in before we know which session to restore.
    getActiveProfile().then((profile) => {
      if (profile) {
        useAppStore.getState().setActiveProfile(profile)
      }
      return loadAutoSave()
    }).then((snapshot) => {
      if (snapshot) {
        loadFromSnapshot(snapshot)
        addToast({ type: 'info', message: '↩ Session restored' })
        // Clamp again after snapshot panels are applied
        const { w, h } = getMapContainerSize()
        useAppStore.getState().clampPanels(w, h)
      }
    })

    const panelState = loadPanelState()
    if (panelState) {
      useAppStore.setState((s) => ({
        panels: { ...s.panels, ...panelState },
      }))
    }

    // Clamp after a short delay so the DOM has rendered and we can measure the container
    requestAnimationFrame(() => {
      const { w, h } = getMapContainerSize()
      useAppStore.getState().clampPanels(w, h)
    })
  }, []) // eslint-disable-line

  // ── Public helpers ────────────────────────────────────────────────────────
  const save = useCallback(async (name) => {
    try {
      await saveProject(name || project.name)
      addToast({ type: 'success', message: `"${name || project.name}" saved` })
    } catch (e) {
      addToast({ type: 'error', message: `Save failed: ${e.message}` })
    }
  }, [project.name, addToast])

  const load = useCallback(async (id) => {
    try {
      await loadProject(id)
      addToast({ type: 'success', message: 'Project loaded' })
    } catch (e) {
      addToast({ type: 'error', message: `Load failed: ${e.message}` })
    }
  }, [addToast])

  const list = useCallback(() => listProjects(), [])

  const remove = useCallback(async (id) => {
    await deleteProject(id)
    addToast({ type: 'info', message: 'Project deleted' })
  }, [addToast])

  return { save, load, list, remove }
}
