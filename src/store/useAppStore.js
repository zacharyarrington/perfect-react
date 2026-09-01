import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import APP_CONFIG from '../config/app.config'
import { DEFAULT_PANELS, isDockable } from '../config/panels.config'

const DEFAULT_DOCK = { open: false, activeKey: null, width: 340 }

// Given a panel key that's leaving the dock (undocked or closed), find the
// next reasonable active tab: the docked+open panel closest to it in dock
// order, or null if none remain.
function nextDockTab(state, leavingKey) {
  const docked = Object.entries(state.panels)
    .filter(([k, p]) => p.docked && p.open && k !== leavingKey)
    .sort(([, a], [, b]) => (a.dockOrder ?? 0) - (b.dockOrder ?? 0))
    .map(([k]) => k)
  return docked[0] ?? null
}

const useAppStore = create(
  subscribeWithSelector((set, get) => ({
    // ── Auth ─────────────────────────────────────────────────
    // currentUser is the in-memory copy; source of truth is auth/userManager.
    // null = guest (or signed out).
    currentUser: null,
    showLoginDialog: false,

    setCurrentUser: (user) => set({ currentUser: user }),
    setShowLoginDialog: (show) => set({ showLoginDialog: show }),

    // ── Panels ───────────────────────────────────────────────
    panels: DEFAULT_PANELS,
    panelZOrder: Object.keys(DEFAULT_PANELS),

    togglePanel: (panelKey) =>
      set((s) => ({
        panels: {
          ...s.panels,
          [panelKey]: { ...s.panels[panelKey], open: !s.panels[panelKey]?.open },
        },
        panelZOrder: s.panels[panelKey]?.open
          ? s.panelZOrder
          : [...s.panelZOrder.filter((k) => k !== panelKey), panelKey],
      })),

    openPanel: (panelKey) =>
      set((s) => ({
        panels: {
          ...s.panels,
          [panelKey]: { ...s.panels[panelKey], open: true },
        },
        panelZOrder: [...s.panelZOrder.filter((k) => k !== panelKey), panelKey],
      })),

    closePanel: (panelKey) =>
      set((s) => ({
        panels: { ...s.panels, [panelKey]: { ...s.panels[panelKey], open: false } },
      })),

    closeAllPanels: () =>
      set((s) => ({
        panels: Object.fromEntries(
          Object.entries(s.panels).map(([k, p]) => [k, { ...p, open: false }])
        ),
      })),

    setPanelPosition: (panelKey, x, y) =>
      set((s) => ({
        panels: { ...s.panels, [panelKey]: { ...s.panels[panelKey], x, y } },
      })),

    setPanelSize: (panelKey, w, h) =>
      set((s) => ({
        panels: { ...s.panels, [panelKey]: { ...s.panels[panelKey], w, h } },
      })),

    bringPanelToFront: (panelKey) =>
      set((s) => ({
        panelZOrder: [...s.panelZOrder.filter((k) => k !== panelKey), panelKey],
      })),

    resetPanels: () =>
      set({ panels: DEFAULT_PANELS, panelZOrder: Object.keys(DEFAULT_PANELS), dock: DEFAULT_DOCK }),

    // Keep every panel inside the content area after a window resize.
    // Docked panels are skipped — their x/y are inert while docked (the dock
    // owns their visible position), so clamping would just perturb a rect
    // they'll snap back to unmodified whenever they're next popped out.
    clampPanels: (maxW, maxH) =>
      set((s) => {
        const newPanels = {}
        for (const [key, p] of Object.entries(s.panels)) {
          if (p.docked) { newPanels[key] = p; continue }
          const w = p.w || 300
          const h = p.h || 400
          newPanels[key] = {
            ...p,
            x: Math.max(0, Math.min(p.x ?? 0, maxW - Math.min(w, maxW))),
            y: Math.max(0, Math.min(p.y ?? 0, maxH - Math.min(h, maxH))),
          }
        }
        return { panels: newPanels }
      }),

    // ── Dock (tabbed side rail — an alternate home for any dockable panel) ──
    dock: DEFAULT_DOCK,

    // Moves a panel into the dock: opens it, marks it docked, and makes it
    // the active tab. x/y/w/h are deliberately left untouched — that's what
    // lets undockPanel() restore the exact floating rect with no extra state.
    dockPanel: (panelKey) =>
      set((s) => {
        if (!isDockable(panelKey)) return s
        const current = s.panels[panelKey]
        const alreadyDocked = current?.docked
        const maxOrder = Math.max(-1, ...Object.values(s.panels).map((p) => p.dockOrder ?? -1))
        return {
          panels: {
            ...s.panels,
            [panelKey]: {
              ...current,
              open: true,
              docked: true,
              dockOrder: alreadyDocked ? current.dockOrder : maxOrder + 1,
            },
          },
          dock: { ...s.dock, open: true, activeKey: panelKey },
        }
      }),

    // Pops a panel back out to floating, at its last floating x/y/w/h.
    undockPanel: (panelKey) =>
      set((s) => {
        const nextActive = s.dock.activeKey === panelKey ? nextDockTab(s, panelKey) : s.dock.activeKey
        return {
          panels: { ...s.panels, [panelKey]: { ...s.panels[panelKey], docked: false } },
          panelZOrder: [...s.panelZOrder.filter((k) => k !== panelKey), panelKey],
          dock: { ...s.dock, activeKey: nextActive },
        }
      }),

    // Closing a docked tab only hides it (open:false) — it stays docked, so
    // reopening later (sidebar, shortcut) reopens it into the dock, mirroring
    // how closing a floating panel doesn't forget its position.
    closeDockedPanel: (panelKey) =>
      set((s) => {
        const nextActive = s.dock.activeKey === panelKey ? nextDockTab(s, panelKey) : s.dock.activeKey
        return {
          panels: { ...s.panels, [panelKey]: { ...s.panels[panelKey], open: false } },
          dock: { ...s.dock, activeKey: nextActive },
        }
      }),

    setDockActiveKey: (panelKey) => set((s) => ({ dock: { ...s.dock, activeKey: panelKey } })),
    toggleDock: () => set((s) => ({ dock: { ...s.dock, open: !s.dock.open } })),
    setDockWidth: (width) =>
      set((s) => ({ dock: { ...s.dock, width: Math.max(240, Math.min(640, width)) } })),

    reorderDockTabs: (fromKey, toKey) =>
      set((s) => {
        const docked = Object.entries(s.panels)
          .filter(([, p]) => p.docked)
          .sort(([, a], [, b]) => (a.dockOrder ?? 0) - (b.dockOrder ?? 0))
          .map(([k]) => k)
        const from = docked.indexOf(fromKey)
        const to = docked.indexOf(toKey)
        if (from === -1 || to === -1 || from === to) return s
        const reordered = [...docked]
        reordered.splice(to, 0, reordered.splice(from, 1)[0])
        const panels = { ...s.panels }
        reordered.forEach((k, i) => { panels[k] = { ...panels[k], dockOrder: i } })
        return { panels }
      }),

    // The one place "docked vs floating" branches for click-to-open, used by
    // the sidebar and top-bar toggle buttons and by keyboard shortcuts.
    // Docked panels are never toggled closed this way — clicking a docked
    // panel's button always brings it to the front, like clicking a
    // background browser tab, not a toggle switch.
    activatePanel: (panelKey) => {
      const panel = get().panels[panelKey]
      if (panel?.docked) {
        set((s) => ({
          panels: { ...s.panels, [panelKey]: { ...panel, open: true } },
          dock: { ...s.dock, open: true, activeKey: panelKey },
        }))
      } else {
        get().togglePanel(panelKey)
      }
    },

    // ── Sidebar ──────────────────────────────────────────────
    sidebarCollapsed: false,
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

    // ── Theme ────────────────────────────────────────────────
    // 'auto' follows the OS preference; 'dark' / 'light' override it
    theme: APP_CONFIG.defaultTheme,
    setTheme: (theme) => set({ theme }),

    // ── UI state ─────────────────────────────────────────────
    isLoading: false,
    loadingMessage: '',
    setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

    // ── Save status ──────────────────────────────────────────
    // One indicator fed by every auto-save pipeline (panels/theme/dock via
    // usePersistence.js, dashboards via dashboardStorage.js, signed-in user
    // preferences/layout via userManager.js) — callers report into this
    // rather than each pipeline growing its own UI. 'error' means a write
    // actually rejected (quota, private-mode IndexedDB restrictions, etc.),
    // surfaced instead of the historical silent `.catch(() => {})`.
    saveState: 'idle',   // 'idle' | 'saving' | 'saved' | 'error'
    lastSavedAt: null,
    reportSaving: () => set({ saveState: 'saving' }),
    reportSaved: () => set({ saveState: 'saved', lastSavedAt: Date.now() }),
    reportSaveError: () => set({ saveState: 'error' }),

    toasts: [],
    addToast: (toast) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }))
      if (toast.duration !== 0) {
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
        }, toast.duration || 4000)
      }
      return id
    },
    removeToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    // ── Reset (sign-out / clear data) ────────────────────────
    resetAppState: () =>
      set({
        currentUser: null,
        panels: DEFAULT_PANELS,
        panelZOrder: Object.keys(DEFAULT_PANELS),
        dock: DEFAULT_DOCK,
        sidebarCollapsed: false,
        theme: APP_CONFIG.defaultTheme,
      }),
  }))
)

export default useAppStore
