// useMapStore — state for the optional map module, kept separate from the
// core app store so the shell works with or without the map feature.

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export const DEFAULT_LAYER_STYLE = {
  type: 'circle',            // circle | fill | line | symbol
  color: '#00d4c8',
  strokeColor: '#ffffff',
  strokeWidth: 1,
  radius: 6,
  opacity: 0.85,
  fillOpacity: 0.5,
  lineWidth: 2,
  labelField: null,
  popupFields: null,         // null = show all properties in the hover popup
  symbologyMode: 'simple',   // simple | categorical | graduated
  categoricalField: null,
  categoricalValues: [],     // [{value, color, label}]
  graduatedField: null,
  graduatedBreaks: [],       // [{min, max, color, label}]
}

const useMapStore = create(
  subscribeWithSelector((set, get) => ({
    // ── Layers ───────────────────────────────────────────────
    layers: [],
    activeLayerId: null,

    addLayer: (layerData) => {
      const id = `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const newLayer = {
        name: 'New Layer',
        type: 'point',                       // point | line | polygon | mixed
        visible: true,
        opacity: 1,
        geojson: { type: 'FeatureCollection', features: [] },
        filters: [],
        createdAt: new Date().toISOString(),
        ...layerData,
        // These must follow the spread so computed values are never overwritten
        style: { ...DEFAULT_LAYER_STYLE, ...(layerData.style || {}) },
        sourceId: `src_${id}`,
        id,
      }
      set((s) => ({ layers: [...s.layers, newLayer], activeLayerId: id }))
      return id
    },

    removeLayer: (id) =>
      set((s) => ({
        layers: s.layers.filter((l) => l.id !== id),
        activeLayerId: s.activeLayerId === id
          ? (s.layers.find((l) => l.id !== id)?.id || null)
          : s.activeLayerId,
      })),

    updateLayer: (id, updates) =>
      set((s) => ({
        layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      })),

    updateLayerStyle: (id, styleUpdates) =>
      set((s) => ({
        layers: s.layers.map((l) =>
          l.id === id ? { ...l, style: { ...l.style, ...styleUpdates } } : l
        ),
      })),

    reorderLayers: (fromIndex, toIndex) =>
      set((s) => {
        const layers = [...s.layers]
        const [moved] = layers.splice(fromIndex, 1)
        layers.splice(toIndex, 0, moved)
        return { layers }
      }),

    setActiveLayer: (id) => set({ activeLayerId: id }),

    getActiveLayer: () => {
      const { layers, activeLayerId } = get()
      return layers.find((l) => l.id === activeLayerId) || null
    },

    // ── Basemap & camera ─────────────────────────────────────
    mapStyle: 'mapbox://styles/mapbox/dark-v11',
    mapCenter: [-98.5795, 39.8283],  // geographic center of US
    mapZoom: 3.5,

    setMapStyle: (style) => set({ mapStyle: style }),
    setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

    // ── Fit bounds ───────────────────────────────────────────
    pendingFitBounds: null,  // [minLng, minLat, maxLng, maxLat] | null
    setPendingFitBounds: (bounds) => set({ pendingFitBounds: bounds }),
    clearPendingFitBounds: () => set({ pendingFitBounds: null }),

    // ── Selection ────────────────────────────────────────────
    selectedFeatureIds: [],   // [{layerId, featureIndex}]
    setSelectedFeatures: (features) => set({ selectedFeatureIds: features }),
    clearSelection: () => set({ selectedFeatureIds: [] }),
  }))
)

export default useMapStore
