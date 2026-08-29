// useDashboardStore — dashboards and their nested widget instances.
//
// Kept separate from useAppStore (same principle as useMapStore: the shell
// works with or without this feature). Widgets live NESTED inside their
// dashboard (dashboard.widgets), not in a parallel dictionary — clone/
// delete/export are then single-subtree operations with no cascade logic
// to get wrong, which is the same shape of bug withUsersLock (see
// src/auth/userManager.js) had to fix after the fact for a flat table.
//
// Grid geometry lives on each widget instance (`widget.layout`), and the
// react-grid-layout `layout` array is DERIVED from it on every render
// (see DashboardCanvas.jsx) rather than stored as a second array — a
// parallel array could desync (add a widget, forget its layout entry,
// react-grid-layout silently repositions it). applyLayout() below merges
// incoming geometry by id into the existing widgets rather than replacing
// the array, so a concurrent config edit can never be clobbered by a drag.

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { WIDGET_TYPES_BY_ID, DEFAULT_WIDGET_LAYOUTS } from '../widgets/widgets.config'

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

function makeWidget({ type, title, layout, binding, config }) {
  const widgetType = WIDGET_TYPES_BY_ID[type]
  if (!widgetType) throw new Error(`Unknown widget type "${type}"`)
  const id = genId('w')
  return {
    title: title || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Computed fields re-applied after the spread so they can never be
    // silently overwritten by a caller-provided value of the same key.
    layout: { ...DEFAULT_WIDGET_LAYOUTS[type], ...(layout || {}) },
    binding: { ...widgetType.defaultBinding, ...(binding || {}) },
    config: { ...widgetType.defaultConfig, ...(config || {}) },
    type,
    id,
  }
}

function makeDashboard({ name, icon, order }) {
  const id = genId('dash')
  return {
    id,
    name: name || 'New Dashboard',
    icon: icon || null,
    pinned: false,
    order: order ?? 0,
    widgets: [],
    gridCols: 12,
    rowHeight: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const useDashboardStore = create(
  subscribeWithSelector((set, get) => ({
    // ── State ────────────────────────────────────────────────
    dashboards: [],
    activeDashboardId: null,
    loaded: false,

    // ── Dashboards ───────────────────────────────────────────
    setDashboards: (dashboards) => set({ dashboards }),
    setLoaded: (loaded) => set({ loaded }),

    createDashboard: (data = {}) => {
      const dashboard = makeDashboard({ ...data, order: get().dashboards.length })
      set((s) => ({ dashboards: [...s.dashboards, dashboard], activeDashboardId: dashboard.id }))
      return dashboard.id
    },

    updateDashboard: (id, updates) =>
      set((s) => ({
        dashboards: s.dashboards.map((d) =>
          d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
        ),
      })),

    deleteDashboard: (id) =>
      set((s) => {
        const remaining = s.dashboards.filter((d) => d.id !== id)
        const activeDashboardId = s.activeDashboardId === id
          ? (remaining[0]?.id ?? null)
          : s.activeDashboardId
        return { dashboards: remaining, activeDashboardId }
      }),

    duplicateDashboard: (id) => {
      const original = get().dashboards.find((d) => d.id === id)
      if (!original) return null
      const newId = genId('dash')
      const dupe = {
        ...original,
        id: newId,
        name: `${original.name} (copy)`,
        pinned: false,
        order: get().dashboards.length,
        widgets: original.widgets.map((w) => ({ ...w, id: genId('w') })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      set((s) => ({ dashboards: [...s.dashboards, dupe], activeDashboardId: newId }))
      return newId
    },

    reorderDashboards: (fromIndex, toIndex) =>
      set((s) => {
        const dashboards = [...s.dashboards]
        const [moved] = dashboards.splice(fromIndex, 1)
        dashboards.splice(toIndex, 0, moved)
        return { dashboards: dashboards.map((d, i) => ({ ...d, order: i })) }
      }),

    togglePinned: (id) =>
      set((s) => ({
        dashboards: s.dashboards.map((d) => (d.id === id ? { ...d, pinned: !d.pinned } : d)),
      })),

    setActiveDashboard: (id) => set({ activeDashboardId: id }),

    getActiveDashboard: () => {
      const { dashboards, activeDashboardId } = get()
      return dashboards.find((d) => d.id === activeDashboardId) || null
    },

    // ── Widgets (nested under their dashboard) ────────────────
    addWidget: (dashboardId, widgetData) => {
      const widget = makeWidget(widgetData)
      set((s) => ({
        dashboards: s.dashboards.map((d) =>
          d.id === dashboardId ? { ...d, widgets: [...d.widgets, widget], updatedAt: new Date().toISOString() } : d
        ),
      }))
      return widget.id
    },

    updateWidget: (dashboardId, widgetId, updates) =>
      set((s) => ({
        dashboards: s.dashboards.map((d) => {
          if (d.id !== dashboardId) return d
          return {
            ...d,
            widgets: d.widgets.map((w) =>
              w.id === widgetId ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
            ),
            updatedAt: new Date().toISOString(),
          }
        }),
      })),

    removeWidget: (dashboardId, widgetId) =>
      set((s) => ({
        dashboards: s.dashboards.map((d) =>
          d.id === dashboardId
            ? { ...d, widgets: d.widgets.filter((w) => w.id !== widgetId), updatedAt: new Date().toISOString() }
            : d
        ),
      })),

    duplicateWidget: (dashboardId, widgetId) => {
      const dashboard = get().dashboards.find((d) => d.id === dashboardId)
      const original = dashboard?.widgets.find((w) => w.id === widgetId)
      if (!original) return null
      const newId = genId('w')
      // Offset slightly so the duplicate isn't perfectly hidden under the original.
      const dupe = { ...original, id: newId, layout: { ...original.layout, x: original.layout.x + 1, y: original.layout.y + 1 } }
      set((s) => ({
        dashboards: s.dashboards.map((d) =>
          d.id === dashboardId ? { ...d, widgets: [...d.widgets, dupe] } : d
        ),
      }))
      return newId
    },

    /** Merge react-grid-layout's onDragStop/onResizeStop result into widget geometry by id. */
    applyLayout: (dashboardId, rglLayout) =>
      set((s) => {
        const byId = new Map(rglLayout.map((item) => [item.i, item]))
        return {
          dashboards: s.dashboards.map((d) => {
            if (d.id !== dashboardId) return d
            return {
              ...d,
              widgets: d.widgets.map((w) => {
                const item = byId.get(w.id)
                if (!item) return w
                return { ...w, layout: { ...w.layout, x: item.x, y: item.y, w: item.w, h: item.h } }
              }),
            }
          }),
        }
      }),
  }))
)

export default useDashboardStore
