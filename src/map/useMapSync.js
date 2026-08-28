// useMapSync — imperative Mapbox GL sync (layers, style, selection)
// Key design:
//   • Style switching skips the initial mount (map was created with the right style)
//   • reinstallLayers is module-level to avoid stale closure capture by React StrictMode
//   • style.load is used to reinstall layers after a basemap switch; isStyleLoaded() is NOT
//     used as a guard here because in Mapbox GL v3 it checks tile loading too and can return
//     false even when the style is fully ready for addSource/addLayer calls

import { useEffect, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import { buildMapboxLayers, buildFilterExpression } from './LayerRenderer'

const SEL_SRC = '__rmg_sel__'

// ── Module-level reinstall (avoids stale closure from React StrictMode) ──────

export function reinstallLayers(map, prevLayersRef) {
  if (!map) return
  const { layers, selectedFeatureIds } = useAppStore.getState()
  for (const layer of layers) safeAddLayer(map, layer)
  reorderLayers(map, layers)
  syncSelection(map, selectedFeatureIds, layers)
  // Sync prevLayersRef so the diff effect starts clean after reinstall
  if (prevLayersRef) prevLayersRef.current = layers
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export default function useMapSync(mapRef, prevLayersRef) {
  const layers             = useAppStore((s) => s.layers)
  const mapStyle           = useAppStore((s) => s.mapStyle)
  const selectedFeatureIds = useAppStore((s) => s.selectedFeatureIds)

  // Track the previous mapStyle to avoid calling setStyle on initial mount
  // (initialised to the current value so the first run — and StrictMode's
  //  second run — both see prevRef === mapStyle and skip)
  const prevMapStyleRef = useRef(mapStyle)

  // ── Register style.load listener once ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const handler = () => reinstallLayers(map, prevLayersRef)
    map.on('style.load', handler)

    // In case style loaded before this effect ran (fast cache)
    if (map.isStyleLoaded()) reinstallLayers(map, prevLayersRef)

    return () => map.off('style.load', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once; mapRef/prevLayersRef are stable refs

  // ── Basemap style switch ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (prevMapStyleRef.current === mapStyle) {
      prevMapStyleRef.current = mapStyle
      return
    }
    prevMapStyleRef.current = mapStyle
    map.setStyle(mapStyle)
  }, [mapStyle]) // eslint-disable-line

  // ── Sync layers whenever the array changes ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const doSync = () => {
      const prev    = prevLayersRef.current
      const prevIds = new Set(prev.map((l) => l.id))
      const nextIds = new Set(layers.map((l) => l.id))

      // Remove deleted layers
      for (const pl of prev) {
        if (!nextIds.has(pl.id)) removeLayer(map, pl)
      }

      // Add new / update existing
      for (const layer of layers) {
        if (!prevIds.has(layer.id)) safeAddLayer(map, layer)
        else updateLayer(map, layer)
      }

      reorderLayers(map, layers)
      prevLayersRef.current = layers
    }

    if (map.isStyleLoaded()) {
      doSync()
    } else {
      // Style is still loading — retry when it's ready
      map.once('style.load', doSync)
    }
  }, [layers]) // eslint-disable-line

  // ── Selection highlights ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.isStyleLoaded()) {
      syncSelection(map, selectedFeatureIds, layers)
    } else {
      map.once('style.load', () => syncSelection(map, selectedFeatureIds, layers))
    }
  }, [selectedFeatureIds]) // eslint-disable-line
}

// ── Layer helpers (module-level — never stale) ────────────────────────────────

export function safeAddLayer(map, layer) {
  if (!map || !layer?.geojson) return

  try {
    let src = map.getSource(layer.sourceId)
    if (!src) {
      map.addSource(layer.sourceId, { type: 'geojson', data: layer.geojson })
    } else {
      src.setData(layer.geojson)
    }
  } catch (e) {
    console.warn('[MapSync] addSource error:', layer.sourceId, e.message)
    return
  }

  for (const mbl of buildMapboxLayers(layer)) {
    if (!map.getLayer(mbl.id)) {
      try { map.addLayer(mbl) } catch (e) {
        console.warn('[MapSync] addLayer:', mbl.id, e.message)
      }
    }
  }

  applyVisibility(map, layer)
  applyAttrFilter(map, layer)
}

function removeLayer(map, layer) {
  for (const suffix of ALL_SUFFIXES) {
    const mbId = `${layer.id}${suffix}`
    if (map.getLayer(mbId)) try { map.removeLayer(mbId) } catch {}
  }
  if (map.getSource(layer.sourceId)) try { map.removeSource(layer.sourceId) } catch {}
}

function updateLayer(map, layer) {
  const src = map.getSource(layer.sourceId)
  if (!src) { safeAddLayer(map, layer); return }

  try { src.setData(layer.geojson) } catch {}

  const newMbLayers = buildMapboxLayers(layer)
  const newIds = new Set(newMbLayers.map((l) => l.id))

  // Remove any Mapbox layers that no longer belong to this layer (e.g. label
  // layer removed when labelField cleared, or geometry type changed).
  for (const suffix of ALL_SUFFIXES) {
    const mbId = `${layer.id}${suffix}`
    if (!newIds.has(mbId) && map.getLayer(mbId)) {
      try { map.removeLayer(mbId) } catch {}
    }
  }

  for (const mbl of newMbLayers) {
    if (!map.getLayer(mbl.id)) {
      try { map.addLayer(mbl) } catch {}
      continue
    }
    if (mbl.paint) {
      for (const [p, v] of Object.entries(mbl.paint)) {
        try { map.setPaintProperty(mbl.id, p, v) } catch {}
      }
    }
    if (mbl.layout) {
      for (const [p, v] of Object.entries(mbl.layout)) {
        if (p === 'visibility') continue
        try { map.setLayoutProperty(mbl.id, p, v) } catch {}
      }
    }
  }

  applyVisibility(map, layer)
  applyAttrFilter(map, layer)
}

const ALL_SUFFIXES = ['_circle', '_line', '_fill', '_outline', '_symbol', '_label', '_poly_label']

function applyVisibility(map, layer) {
  const vis = layer.visible !== false ? 'visible' : 'none'
  // Use all known suffixes so label layers are always caught, even when
  // buildMapboxLayers wouldn't emit them (e.g. after labelField was cleared
  // but before the stale layer was removed, or when visibility changes first).
  for (const suffix of ALL_SUFFIXES) {
    const mbId = `${layer.id}${suffix}`
    if (map.getLayer(mbId)) try { map.setLayoutProperty(mbId, 'visibility', vis) } catch {}
  }
}

function applyAttrFilter(map, layer) {
  const attrExpr = layer.filters?.length > 0 ? buildFilterExpression(layer.filters) : null
  for (const mbl of buildMapboxLayers(layer)) {
    if (!map.getLayer(mbl.id)) continue
    try {
      const geo = mbl.filter || null
      const combined = geo && attrExpr ? ['all', geo, attrExpr]
                     : geo             ? geo
                     : attrExpr        ? attrExpr
                     : null
      map.setFilter(mbl.id, combined)
    } catch {}
  }
}

function reorderLayers(map, layers) {
  for (const layer of layers) {
    for (const mbl of buildMapboxLayers(layer)) {
      if (map.getLayer(mbl.id)) try { map.moveLayer(mbl.id) } catch {}
    }
  }
  // Selection highlights always on top
  for (const id of ['__rmg_sel_fill','__rmg_sel_outline','__rmg_sel_line','__rmg_sel_circle']) {
    if (map.getLayer(id)) try { map.moveLayer(id) } catch {}
  }
  // Measurement overlay always above everything
  for (const id of ['__rmg_measure_line', '__rmg_measure_pts']) {
    if (map.getLayer(id)) try { map.moveLayer(id) } catch {}
  }
}

// ── Selection highlight sync ──────────────────────────────────────────────────

function syncSelection(map, selectedFeatureIds, layers) {
  if (!map) return

  const features = []
  for (const sel of (selectedFeatureIds || [])) {
    if (sel.featureIndex !== undefined) {
      const layer = layers.find((l) => l.id === sel.layerId)
      const f = layer?.geojson?.features?.[sel.featureIndex]
      if (f) features.push(f)
    }
  }

  const fc = { type: 'FeatureCollection', features }

  try {
    if (!map.getSource(SEL_SRC)) {
      map.addSource(SEL_SRC, { type: 'geojson', data: fc })
    } else {
      map.getSource(SEL_SRC).setData(fc)
    }
  } catch {}

  const SEL_LAYERS = [
    {
      id: '__rmg_sel_circle', type: 'circle', source: SEL_SRC,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 12, 'circle-color': 'rgba(0,212,200,0)',
        'circle-stroke-color': '#00d4c8', 'circle-stroke-width': 3,
        'circle-stroke-opacity': 0.9,
      },
    },
    {
      id: '__rmg_sel_line', type: 'line', source: SEL_SRC,
      filter: ['==', '$type', 'LineString'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#00d4c8', 'line-width': 5, 'line-opacity': 0.85 },
    },
    {
      id: '__rmg_sel_fill', type: 'fill', source: SEL_SRC,
      filter: ['==', '$type', 'Polygon'],
      paint: { 'fill-color': '#00d4c8', 'fill-opacity': 0.25 },
    },
    {
      id: '__rmg_sel_outline', type: 'line', source: SEL_SRC,
      filter: ['==', '$type', 'Polygon'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#00d4c8', 'line-width': 3, 'line-opacity': 0.9 },
    },
  ]

  for (const l of SEL_LAYERS) {
    if (!map.getLayer(l.id)) try { map.addLayer(l) } catch {}
  }
}
