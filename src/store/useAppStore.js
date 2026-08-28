import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

const DEFAULT_LAYER_STYLE = {
  type: 'circle',            // circle | fill | line | symbol
  color: '#00d4c8',
  strokeColor: '#ffffff',
  strokeWidth: 1,
  radius: 6,
  opacity: 0.85,
  fillOpacity: 0.5,
  lineWidth: 2,
  iconType: 'circle',
  iconSize: 1.0,
  labelField: null,
  popupFields: [],           // fields shown in the hover popup
  symbologyMode: 'simple',   // simple | categorical | graduated | rule-based
  categoricalField: null,
  graduatedField: null,
  colorRamp: 'teal-blue',
  numBreaks: 5,
  breakMethod: 'quantile',   // quantile | equalInterval | naturalBreaks
  rules: [],                 // [{filter, style}]
  categoricalValues: [],     // [{value, color, label}]
  graduatedBreaks: [],       // [{min, max, color, label}]
}

const DEFAULT_PANELS = {
  layers:     { open: true,  x: 60,   y: 120,  w: 280, h: 420 },
  symbology:  { open: false, x: 310,  y: 70,  w: 320, h: 480 },
  attributes: { open: false, x: 12,   y: 510, w: 700, h: 320 },
  gistools:   { open: false, x: 640,  y: 70,  w: 300, h: 500 },
  filters:    { open: false, x: 310,  y: 70,  w: 340, h: 380 },
  dashboard:  { open: false, x: 12,   y: 70,  w: 560, h: 440 },
  export:     { open: false, x: 200,  y: 100, w: 360, h: 500 },
  mapstyle:   { open: false, x: 12,   y: 70,  w: 280, h: 320 },
  measure:    { open: false, x: 12,   y: 70,  w: 280, h: 200 },
  search:     { open: false, x: 310,  y: 70,  w: 300, h: 380 },
  print:      { open: false, x: 400,  y: 100, w: 320, h: 560 },
  settings:    { open: false, x: 200,  y: 140, w: 300, h: 320 },
  keybindings: { open: false, x: 220,  y: 120, w: 320, h: 480 },
  gislog:      { open: false, x: 360,  y: 120, w: 340, h: 420 },
}

const useAppStore = create(
  subscribeWithSelector((set, get) => ({
    // ── Project ──────────────────────────────────────────────
    project: {
      name: 'Untitled Project',
      description: '',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    },
    setProjectName: (name) =>
      set((s) => ({ project: { ...s.project, name, modifiedAt: new Date().toISOString() } })),

    // ── Layers ───────────────────────────────────────────────
    layers: [],
    activeLayerId: null,

    addLayer: (layerData) => {
      get().pushHistory()
      const id = `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const newLayer = {
        name: 'New Layer',
        type: 'point',                       // point | line | polygon | mixed
        visible: true,
        locked: false,
        opacity: 1,
        geojson: { type: 'FeatureCollection', features: [] },
        filters: [],
        filterExpression: null,              // compiled Mapbox filter expression
        layerIds: [],                        // mapbox layer IDs rendered for this layer
        createdAt: new Date().toISOString(),
        ...layerData,
        // These must follow the spread so computed values are never overwritten
        style: { ...DEFAULT_LAYER_STYLE, ...(layerData.style || {}) },
        sourceId: `src_${id}`,
        id,
      }
      set((s) => ({
        layers: [...s.layers, newLayer],
        activeLayerId: id,
      }))
      return id
    },

    removeLayer: (id) => {
      get().pushHistory()
      set((s) => ({
        layers: s.layers.filter((l) => l.id !== id),
        activeLayerId: s.activeLayerId === id
          ? (s.layers.find((l) => l.id !== id)?.id || null)
          : s.activeLayerId,
      }))
    },

    duplicateLayer: (id) => {
      const original = get().layers.find((l) => l.id === id)
      if (!original) return
      get().pushHistory()
      const newId = `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const dupe = {
        ...original,
        id: newId,
        sourceId: `src_${newId}`,
        name: `${original.name} (copy)`,
        createdAt: new Date().toISOString(),
        layerIds: [],
      }
      set((s) => ({ layers: [...s.layers, dupe], activeLayerId: newId }))
    },

    updateLayer: (id, updates) =>
      set((s) => ({
        layers: s.layers.map((l) => l.id === id ? { ...l, ...updates } : l),
      })),

    updateLayerStyle: (id, styleUpdates) =>
      set((s) => ({
        layers: s.layers.map((l) =>
          l.id === id ? { ...l, style: { ...l.style, ...styleUpdates } } : l
        ),
      })),

    reorderLayers: (fromIndex, toIndex) => {
      get().pushHistory()
      set((s) => {
        const layers = [...s.layers]
        const [moved] = layers.splice(fromIndex, 1)
        layers.splice(toIndex, 0, moved)
        return { layers }
      })
    },

    setActiveLayer: (id) => set({ activeLayerId: id }),

    getActiveLayer: () => {
      const { layers, activeLayerId } = get()
      return layers.find((l) => l.id === activeLayerId) || null
    },

    updateFeatureProperty: (layerId, featureIndex, property, value) =>
      set((s) => ({
        layers: s.layers.map((l) => {
          if (l.id !== layerId) return l
          const features = [...l.geojson.features]
          features[featureIndex] = {
            ...features[featureIndex],
            properties: {
              ...features[featureIndex].properties,
              [property]: value,
            },
          }
          return { ...l, geojson: { ...l.geojson, features } }
        }),
      })),

    addFeaturesToLayer: (layerId, features) => {
      get().pushHistory()
      set((s) => ({
        layers: s.layers.map((l) => {
          if (l.id !== layerId) return l
          return {
            ...l,
            geojson: {
              ...l.geojson,
              features: [...l.geojson.features, ...features],
            },
          }
        }),
      }))
    },

    // ── Layer Filters ─────────────────────────────────────────
    setLayerFilters: (layerId, filters) =>
      set((s) => ({
        layers: s.layers.map((l) =>
          l.id === layerId ? { ...l, filters } : l
        ),
      })),

    // ── Panels ───────────────────────────────────────────────
    panels: DEFAULT_PANELS,
    panelZOrder: Object.keys(DEFAULT_PANELS),

    togglePanel: (panelKey) =>
      set((s) => ({
        panels: {
          ...s.panels,
          [panelKey]: { ...s.panels[panelKey], open: !s.panels[panelKey].open },
        },
        panelZOrder: s.panels[panelKey].open
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

    resetPanels: () => set({ panels: DEFAULT_PANELS }),

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

    // ── Map ──────────────────────────────────────────────────
    mapStyle: 'mapbox://styles/mapbox/streets-v12',
    mapCenter: [-98.5795, 39.8283],  // geographic center of US
    mapZoom: 4,

    setMapStyle: (style) => set({ mapStyle: style }),
    setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

    // ── Theme ─────────────────────────────────────────────────
    // 'auto' follows the basemap; 'dark' / 'light' override it
    appTheme: 'light',
    setAppTheme: (theme) => set({ appTheme: theme }),

    // ── Fit bounds ───────────────────────────────────────────────
    pendingFitBounds: null,  // [minLng, minLat, maxLng, maxLat] | null
    setPendingFitBounds: (bounds) => set({ pendingFitBounds: bounds }),
    clearPendingFitBounds: () => set({ pendingFitBounds: null }),

    // ── Map refresh ──────────────────────────────────────────────
    mapRefreshKey: 0,
    triggerMapRefresh: () => set((s) => ({ mapRefreshKey: s.mapRefreshKey + 1 })),

    // ── Drawing ──────────────────────────────────────────────
    drawMode: null,           // null | 'draw_point' | 'draw_line_string' | 'draw_polygon' | 'draw_rectangle'
    drawTargetLayerId: null,  // which layer drawn features go to (null = new layer)

    setDrawMode: (mode) => set({ drawMode: mode }),
    setDrawTargetLayer: (id) => set({ drawTargetLayerId: id }),

    // ── Edit mode ────────────────────────────────────────────
    editLayerId: null,        // layer currently being edited in MapboxDraw

    setEditLayer: (id) => set({ editLayerId: id }),

    updateLayerGeojson: (layerId, geojson) => {
      get().pushHistory()
      set((s) => ({
        layers: s.layers.map((l) =>
          l.id === layerId ? { ...l, geojson } : l
        ),
      }))
    },

    // ── Selection ────────────────────────────────────────────
    selectedFeatureIds: [],   // [{layerId, featureIndex}]

    setSelectedFeatures: (features) => set({ selectedFeatureIds: features }),
    clearSelection: () => set({ selectedFeatureIds: [] }),

    // ── Measure ──────────────────────────────────────────────
    measureMode: null,        // null | 'distance' | 'area'
    measureResult: null,

    setMeasureMode: (mode) => set({ measureMode: mode, measureResult: null }),
    setMeasureResult: (result) => set({ measureResult: result }),

    // ── Workflow ─────────────────────────────────────────────
    // Linear step list — each step feeds the next implicitly.
    // Edges are no longer needed; connections are positional.
    workflowOpen: false,
    workflowSteps: [],   // [{ id, type, params }]
    workflowEdges: [],   // kept for legacy full-screen canvas serialization

    setWorkflowOpen: (open) => set({ workflowOpen: open }),

    addWorkflowStep: (step) =>
      set((s) => ({
        workflowSteps: [
          ...s.workflowSteps,
          { id: `ws_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, params: {}, ...step },
        ],
      })),

    updateWorkflowStep: (id, updates) =>
      set((s) => ({
        workflowSteps: s.workflowSteps.map((n) => n.id === id ? { ...n, ...updates } : n),
      })),

    removeWorkflowStep: (id) =>
      set((s) => ({ workflowSteps: s.workflowSteps.filter((n) => n.id !== id) })),

    moveWorkflowStep: (id, direction) =>
      set((s) => {
        const steps = [...s.workflowSteps]
        const idx = steps.findIndex((n) => n.id === id)
        const target = idx + direction
        if (target < 0 || target >= steps.length) return {}
        ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
        return { workflowSteps: steps }
      }),

    clearWorkflow: () => set({ workflowSteps: [] }),

    // ── Legacy canvas nodes/edges (full-screen view, kept for future use) ──
    workflowNodes: [],
    workflowEdges: [],
    addWorkflowNode: (node) =>
      set((s) => ({
        workflowNodes: [...s.workflowNodes, { id: `wn_${Date.now()}`, params: {}, ...node }],
      })),
    updateWorkflowNode: (id, u) =>
      set((s) => ({ workflowNodes: s.workflowNodes.map((n) => n.id === id ? { ...n, ...u } : n) })),
    removeWorkflowNode: (id) =>
      set((s) => ({
        workflowNodes: s.workflowNodes.filter((n) => n.id !== id),
        workflowEdges: s.workflowEdges.filter((e) => e.fromNodeId !== id && e.toNodeId !== id),
      })),
    addWorkflowEdge: (edge) =>
      set((s) => ({ workflowEdges: [...s.workflowEdges.filter((e) => !(e.toNodeId === edge.toNodeId && e.toPort === edge.toPort)), { id: `we_${Date.now()}`, ...edge }] })),
    removeWorkflowEdge: (id) =>
      set((s) => ({ workflowEdges: s.workflowEdges.filter((e) => e.id !== id) })),

    // ── Dashboard ────────────────────────────────────────────
    dashboardCharts: [],

    addChart: (chart) =>
      set((s) => ({
        dashboardCharts: [
          ...s.dashboardCharts,
          { id: `chart_${Date.now()}`, ...chart },
        ],
      })),

    removeChart: (id) =>
      set((s) => ({
        dashboardCharts: s.dashboardCharts.filter((c) => c.id !== id),
      })),

    updateChart: (id, updates) =>
      set((s) => ({
        dashboardCharts: s.dashboardCharts.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      })),

    // ── UI State ─────────────────────────────────────────────
    isLoading: false,
    loadingMessage: '',
    setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

    toasts: [],
    addToast: (toast) => {
      const id = `toast_${Date.now()}`
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

    // ── GIS Log ──────────────────────────────────────────────
    gisLog: [],   // [{ id, ts, tool, status: 'success'|'error', message, detail }]

    addGisLogEntry: (entry) =>
      set((s) => ({
        gisLog: [
          { id: `gis_${Date.now()}`, ts: new Date().toISOString(), ...entry },
          ...s.gisLog.slice(0, 199),   // keep last 200
        ],
      })),

    clearGisLog: () => set({ gisLog: [] }),

    // ── Export ───────────────────────────────────────────────
    kmlExportSettings: {
      pointColor: '#ff0000',
      pointScale: 1.0,
      lineColor: '#0000ff',
      lineWidth: 2,
      lineOpacity: 1.0,
      fillColor: '#00ff00',
      fillOpacity: 0.5,
      strokeColor: '#000000',
      strokeWidth: 1,
      strokeOpacity: 1.0,
      iconPreset: 'yellow-dot',
      iconUrl: '',
      documentName: '',
      folderName: '',
      documentDescription: '',
      sampleFeatureIndex: 0,
      featureNameField: 'auto',
      featureDescriptionField: 'auto',
      altitudeMode: 'clampToGround',
      visibility: true,
      open: true,
      tessellate: false,
      extrude: false,
      labelScale: 0.7,
    },
    setKmlExportSettings: (settings) =>
      set((s) => ({ kmlExportSettings: { ...s.kmlExportSettings, ...settings } })),

    // ── Profile ──────────────────────────────────────────────
    // activeProfile is the in-memory copy; source of truth is profileManager
    activeProfile: null,   // { id, username, color, preferences, layout } | null
    showLoginDialog: false,

    setActiveProfile: (profile) => set({ activeProfile: profile }),
    setShowLoginDialog: (show) => set({ showLoginDialog: show }),

    // ── History (Undo / Redo) ─────────────────────────────────
    past: [],    // array of { layers, activeLayerId } snapshots (max 50)
    future: [],  // array of snapshots available for redo

    pushHistory: () => {
      const { layers, activeLayerId } = get()
      set((s) => ({
        past: [...s.past.slice(-49), { layers, activeLayerId }],
        future: [],
      }))
    },

    undo: () => {
      const { past, layers, activeLayerId } = get()
      if (past.length === 0) return
      const previous = past[past.length - 1]
      const current = { layers, activeLayerId }
      set((s) => ({
        past: s.past.slice(0, -1),
        future: [current, ...s.future.slice(0, 49)],
        layers: previous.layers,
        activeLayerId: previous.activeLayerId,
      }))
    },

    redo: () => {
      const { future, layers, activeLayerId } = get()
      if (future.length === 0) return
      const next = future[0]
      const current = { layers, activeLayerId }
      set((s) => ({
        past: [...s.past.slice(-49), current],
        future: s.future.slice(1),
        layers: next.layers,
        activeLayerId: next.activeLayerId,
      }))
    },

    // ── Serialization ─────────────────────────────────────────
    serialize: () => {
      const s = get()
      return {
        project: s.project,
        layers: s.layers,
        panels: s.panels,
        mapStyle: s.mapStyle,
        mapCenter: s.mapCenter,
        mapZoom: s.mapZoom,
        dashboardCharts: s.dashboardCharts,
        kmlExportSettings: s.kmlExportSettings,
        appTheme: s.appTheme,
        workflowSteps: s.workflowSteps,
        workflowNodes: s.workflowNodes,
        workflowEdges: s.workflowEdges,
      }
    },

    // Restores the entire in-memory app state to its just-launched defaults.
    // Used for sign-out (clear current session view) and deep-clean (full wipe).
    resetAppState: () => {
      set({
        project: {
          name: 'Untitled Project',
          description: '',
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
        layers: [],
        activeLayerId: null,
        panels: DEFAULT_PANELS,
        panelZOrder: Object.keys(DEFAULT_PANELS),
        mapStyle: 'mapbox://styles/mapbox/streets-v12',
        mapCenter: [-98.5795, 39.8283],
        mapZoom: 4,
        appTheme: 'light',
        pendingFitBounds: null,
        drawMode: null,
        drawTargetLayerId: null,
        editLayerId: null,
        selectedFeatureIds: [],
        measureMode: null,
        measureResult: null,
        workflowOpen: false,
        workflowSteps: [],
        workflowNodes: [],
        workflowEdges: [],
        dashboardCharts: [],
        gisLog: [],
        activeProfile: null,
        past: [],
        future: [],
      })
      get().triggerMapRefresh()
    },

    loadFromSnapshot: (snapshot) => {
      set({
        project:          snapshot.project || get().project,
        layers:           snapshot.layers || [],
        panels:           snapshot.panels ? { ...DEFAULT_PANELS, ...snapshot.panels } : DEFAULT_PANELS,
        mapStyle:         snapshot.mapStyle || get().mapStyle,
        mapCenter:        snapshot.mapCenter || get().mapCenter,
        mapZoom:          snapshot.mapZoom || get().mapZoom,
        dashboardCharts:  snapshot.dashboardCharts || [],
        kmlExportSettings: snapshot.kmlExportSettings || get().kmlExportSettings,
        activeLayerId: snapshot.layers?.[0]?.id || null,
        appTheme:         snapshot.appTheme || 'light',
        workflowSteps:    snapshot.workflowSteps || [],
        workflowNodes:    snapshot.workflowNodes || [],
        workflowEdges:    snapshot.workflowEdges || [],
        past: [],
        future: [],
      })
    },
  }))
)

export default useAppStore
