import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import APP_CONFIG from '../config/app.config'
import { DEFAULT_PANELS } from '../config/panels.config'

const useAppStore = create(
  subscribeWithSelector((set) => ({
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

    resetPanels: () => set({ panels: DEFAULT_PANELS, panelZOrder: Object.keys(DEFAULT_PANELS) }),

    // Keep every panel inside the content area after a window resize
    clampPanels: (maxW, maxH) =>
      set((s) => {
        const newPanels = {}
        for (const [key, p] of Object.entries(s.panels)) {
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
        sidebarCollapsed: false,
        theme: APP_CONFIG.defaultTheme,
      }),
  }))
)

export default useAppStore
