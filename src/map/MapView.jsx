import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import useAppStore from '../store/useAppStore'
import useMapSync, { reinstallLayers } from './useMapSync'
import { buildMapboxLayers } from './LayerRenderer'
import * as turf from '@turf/turf'
import { BASE_STYLES } from './mapStyles'
import { IconRuler, IconRuler2, IconCopy } from '@tabler/icons-react'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

// IDs for the live measurement overlay
const MEASURE_SRC    = '__rmg_measure__'
const MEASURE_LINE   = '__rmg_measure_line'
const MEASURE_POINTS = '__rmg_measure_pts'

export default function MapView() {
  const mapContainer  = useRef(null)
  const mapRef        = useRef(null)
  const drawRef       = useRef(null)
  const prevLayersRef = useRef([])
  const hoverPopupRef = useRef(null)

  // Measurement state lives here so we can update the map source directly
  const measurePointsRef = useRef([])

  const [coords, setCoords] = useState({ lng: 0, lat: 0 })
  const [mapCtxMenu, setMapCtxMenu] = useState(null) // { x, y, lng, lat }

  const {
    mapCenter, mapZoom, mapStyle, drawMode, drawTargetLayerId,
    setDrawMode, addLayer, addFeaturesToLayer,
    setSelectedFeatures, openPanel, addToast,
    measureMode, setMeasureMode, setMeasureResult,
    pendingFitBounds, clearPendingFitBounds,
    editLayerId, setEditLayer, updateLayerGeojson, layers,
    mapRefreshKey,
  } = useAppStore()

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return

    const map = new mapboxgl.Map({
      container:  mapContainer.current,
      style:      mapStyle,
      center:     mapCenter,
      zoom:       mapZoom,
      projection: 'globe',
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-left')
    map.addControl(new mapboxgl.ScaleControl({ unit: 'imperial' }), 'bottom-left')
    map.addControl(new mapboxgl.FullscreenControl(), 'top-left')
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    }), 'top-left')

    const draw = new MapboxDraw({ displayControlsDefault: false })
    map.addControl(draw, 'top-left')
    drawRef.current = draw

    map.on('mousemove', (e) => {
      setCoords({ lng: e.lngLat.lng.toFixed(5), lat: e.lngLat.lat.toFixed(5) })
    })

    // ── Hover popup ───────────────────────────────────────────────────────────
    const hoverPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'rmg-hover-popup',
      maxWidth: '280px',
      offset: 12,
    })
    hoverPopupRef.current = hoverPopup

    map.on('mousemove', (e) => {
      const { measureMode: currentMode, layers: currentLayers } = useAppStore.getState()
      if (currentMode) return

      const mbLayerIds = currentLayers
        .filter((l) => l.visible !== false)
        .flatMap((l) => buildMapboxLayers(l).map((ml) => ml.id))
        .filter((id) => map.getLayer(id))

      if (!mbLayerIds.length) {
        map.getCanvas().style.cursor = ''
        hoverPopup.remove()
        return
      }

      const features = map.queryRenderedFeatures(e.point, { layers: mbLayerIds })
      if (!features.length) {
        map.getCanvas().style.cursor = ''
        hoverPopup.remove()
        return
      }

      map.getCanvas().style.cursor = 'pointer'

      // Find the app layer for this feature
      const f = features[0]
      const match = currentLayers.find((l) =>
        buildMapboxLayers(l).some((ml) => ml.id === f.layer?.id)
      )
      if (!match) return

      const popupFields = match.style?.popupFields
      if (!popupFields?.length) {
        hoverPopup.remove()
        return
      }

      const props = f.properties || {}
      const rows = popupFields
        .filter((field) => props[field] !== undefined && props[field] !== null && props[field] !== '')
        .map((field) => `<tr><td class="rmg-popup-key">${field}</td><td class="rmg-popup-val">${props[field]}</td></tr>`)
        .join('')

      if (!rows) {
        hoverPopup.remove()
        return
      }

      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(`<div class="rmg-popup-header">${match.name}</div><table class="rmg-popup-table">${rows}</table>`)
        .addTo(map)
    })

    map.on('mouseleave', () => {
      map.getCanvas().style.cursor = ''
      hoverPopup.remove()
    })

    // Add measurement overlay sources/layers once style is loaded
    const setupMeasureOverlay = () => {
      if (!map.getSource(MEASURE_SRC)) {
        map.addSource(MEASURE_SRC, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: MEASURE_LINE, type: 'line', source: MEASURE_SRC,
          filter: ['==', '$type', 'LineString'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#f59e0b',
            'line-width': 2.5,
            'line-opacity': 0.9,
            'line-dasharray': [4, 2],
          },
        })
        map.addLayer({
          id: MEASURE_POINTS, type: 'circle', source: MEASURE_SRC,
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 5,
            'circle-color': '#f59e0b',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        })
      }
      // Restore any active measurement points after a style change
      updateMeasureOverlay(map, measurePointsRef.current)
    }
    map.on('style.load', setupMeasureOverlay)
    // If style already loaded before this effect ran (fast cache hit), set up immediately
    if (map.isStyleLoaded()) setupMeasureOverlay()

    mapRef.current = map

    return () => {
      hoverPopup.remove()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line

  // ── Layer / style sync ────────────────────────────────────────────────────
  useMapSync(mapRef, prevLayersRef)

  // ── Force redraw (reinstalls all layers in correct order) ─────────────────
  useEffect(() => {
    if (mapRefreshKey === 0) return
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    reinstallLayers(map, prevLayersRef)
  }, [mapRefreshKey]) // eslint-disable-line

  // ── Draw mode sync ────────────────────────────────────────────────────────
  useEffect(() => {
    const draw = drawRef.current
    if (!draw) return
    if (drawMode) {
      try { draw.changeMode(drawMode) } catch {}
    } else {
      try { draw.changeMode('simple_select') } catch {}
    }
  }, [drawMode])

  // ── Edit mode: load layer into Draw, sync changes back ───────────────────
  useEffect(() => {
    const map = mapRef.current
    const draw = drawRef.current
    if (!map || !draw) return

    if (!editLayerId) {
      draw.deleteAll()
      try { draw.changeMode('simple_select') } catch {}
      return
    }

    const layer = useAppStore.getState().layers.find((l) => l.id === editLayerId)
    if (!layer?.geojson) return

    // Hide the real Mapbox layer while editing to avoid visual overlap
    const setLayerVisibility = (vis) => {
      for (const mbl of buildMapboxLayers(layer)) {
        if (map.getLayer(mbl.id)) {
          try { map.setLayoutProperty(mbl.id, 'visibility', vis) } catch {}
        }
      }
    }

    setLayerVisibility('none')
    draw.deleteAll()
    draw.add(layer.geojson)
    try { draw.changeMode('simple_select') } catch {}

    const syncFromAll = () => {
      const features = draw.getAll().features.map((f) => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: f.properties || {},
      }))
      updateLayerGeojson(editLayerId, { type: 'FeatureCollection', features })
    }

    // draw.delete fires before MapboxDraw removes features from its state,
    // so getAll() still includes the deleted features — use the event's own
    // feature list to know what was removed and filter them out explicitly.
    const syncFromDelete = (e) => {
      const deletedIds = new Set((e.features || []).map((f) => f.id))
      const features = draw.getAll().features
        .filter((f) => !deletedIds.has(f.id))
        .map((f) => ({
          type: 'Feature',
          geometry: f.geometry,
          properties: f.properties || {},
        }))
      updateLayerGeojson(editLayerId, { type: 'FeatureCollection', features })
    }

    map.on('draw.update', syncFromAll)
    map.on('draw.delete', syncFromDelete)

    return () => {
      map.off('draw.update', syncFromAll)
      map.off('draw.delete', syncFromDelete)
      // Restore visibility when effect cleans up
      if (layer.visible !== false) setLayerVisibility('visible')
    }
  }, [editLayerId]) // eslint-disable-line

  // ── Handle drawn features ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const draw = drawRef.current
    if (!map || !draw) return

    const handleCreate = (e) => {
      const features = e.features
      if (!features?.length) return
      draw.deleteAll()

      const geojsonFeatures = features.map((f) => ({
        ...f,
        properties: { ...f.properties, _source: 'drawn', _created: new Date().toISOString() },
      }))

      if (drawTargetLayerId) {
        addFeaturesToLayer(drawTargetLayerId, geojsonFeatures)
        addToast({ type: 'success', message: `Added ${geojsonFeatures.length} feature(s) to layer` })
      } else {
        // Determine geometry type from the actual geometry
        const geomType = geojsonFeatures[0]?.geometry?.type || ''
        const layerType = geomType.toLowerCase().includes('point')   ? 'point'
                        : geomType.toLowerCase().includes('line')    ? 'line'
                        : geomType.toLowerCase().includes('polygon') ? 'polygon'
                        : 'mixed'

        addLayer({
          name: `Drawn ${layerType.charAt(0).toUpperCase() + layerType.slice(1)}`,
          type: layerType,
          geojson: { type: 'FeatureCollection', features: geojsonFeatures },
        })
        addToast({ type: 'success', message: `Created new ${layerType} layer` })
      }
      setDrawMode(null)
    }

    map.on('draw.create', handleCreate)
    return () => map.off('draw.create', handleCreate)
  }, [drawTargetLayerId, addLayer, addFeaturesToLayer, setDrawMode, addToast])

  // ── Measure mode: cursor + live line on map ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const canvas = map.getCanvas()

    if (measureMode === 'distance') {
      canvas.style.cursor = 'crosshair'
      // Reset points when entering measure mode
      measurePointsRef.current = []
      updateMeasureOverlay(map, [])
    } else if (measureMode === 'area') {
      canvas.style.cursor = 'crosshair'
      measurePointsRef.current = []
      updateMeasureOverlay(map, [])
    } else {
      // Clear measure mode
      canvas.style.cursor = ''
      measurePointsRef.current = []
      updateMeasureOverlay(map, [])
    }
  }, [measureMode])

  // ── Feature click selection + measure clicks ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const handleClick = (e) => {
      const { measureMode: currentMode } = useAppStore.getState()

      if (currentMode === 'distance') {
        const pts = measurePointsRef.current
        pts.push([e.lngLat.lng, e.lngLat.lat])
        updateMeasureOverlay(map, pts)

        if (pts.length >= 2) {
          const line = turf.lineString(pts)
          const len = turf.length(line, { units: 'kilometers' })
          setMeasureResult({
            type: 'distance',
            km: len,
            miles: len * 0.621371,
            meters: len * 1000,
            feet: len * 3280.84,
            points: [...pts],
          })
        }
        return
      }

      if (currentMode === 'area') {
        const pts = measurePointsRef.current
        pts.push([e.lngLat.lng, e.lngLat.lat])
        updateMeasureOverlay(map, pts)

        if (pts.length >= 3) {
          // Close the polygon
          const polygon = turf.polygon([[...pts, pts[0]]])
          const area = turf.area(polygon)
          setMeasureResult({
            type: 'area',
            m2: area,
            km2: area / 1e6,
            acres: area / 4046.86,
            sqFt: area * 10.7639,
            points: [...pts],
          })
        }
        return
      }

      // ── Feature selection ──
      const bbox = [
        [e.point.x - 6, e.point.y - 6],
        [e.point.x + 6, e.point.y + 6],
      ]
      const currentLayers = useAppStore.getState().layers
      const mbLayerIds = currentLayers
        .flatMap((l) => buildMapboxLayers(l).map((ml) => ml.id))
        .filter((id) => map.getLayer(id))

      if (!mbLayerIds.length) return

      const features = map.queryRenderedFeatures(bbox, { layers: mbLayerIds })
      if (!features.length) {
        setSelectedFeatures([])
        return
      }

      const f = features[0]
      const layerMbId = f.layer?.id
      const match = currentLayers.find((l) =>
        buildMapboxLayers(l).some((ml) => ml.id === layerMbId)
      )
      if (match) {
        // Mapbox uses the GeoJSON array index as the implicit feature id for sources without explicit ids
        const featureIndex = typeof f.id === 'number'
          ? f.id
          : match.geojson.features.findIndex((gf) =>
              gf.properties && f.properties &&
              Object.keys(f.properties).every((k) => String(gf.properties[k]) === String(f.properties[k]))
            )
        openPanel('attributes')
        setSelectedFeatures([{ layerId: match.id, featureIndex: featureIndex >= 0 ? featureIndex : 0 }])

        // Zoom in when clicking a point feature
        if (f.geometry?.type === 'Point') {
          const [lng, lat] = f.geometry.coordinates
          const currentZoom = map.getZoom()
          map.flyTo({ center: [lng, lat], zoom: Math.max(currentZoom, 14), speed: 1.2 })
        }
      }
    }

    // Right-click / double-click to finish measurement
    const handleDblClick = (e) => {
      const { measureMode: currentMode } = useAppStore.getState()
      if (currentMode) {
        e.preventDefault()
        measurePointsRef.current = []
        updateMeasureOverlay(map, [])
      }
    }

    const handleContextMenu = (e) => {
      e.preventDefault()
      setMapCtxMenu({ x: e.point.x, y: e.point.y, lng: e.lngLat.lng, lat: e.lngLat.lat })
    }

    map.on('click', handleClick)
    map.on('dblclick', handleDblClick)
    map.on('contextmenu', handleContextMenu)
    return () => {
      map.off('click', handleClick)
      map.off('dblclick', handleDblClick)
      map.off('contextmenu', handleContextMenu)
    }
  }, [setSelectedFeatures, openPanel, setMeasureResult])

  // ── Fit map to imported layer bounds ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !pendingFitBounds) return
    clearPendingFitBounds()
    const [minLng, minLat, maxLng, maxLat] = pendingFitBounds
    if (minLng === maxLng && minLat === maxLat) {
      map.flyTo({ center: [minLng, minLat], zoom: 14 })
    } else {
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 16 })
    }
  }, [pendingFitBounds]) // eslint-disable-line

  const ctxMenuStyle = {
    position: 'fixed',
    top: mapCtxMenu ? Math.min(mapCtxMenu.y + (mapContainer.current?.getBoundingClientRect().top || 0), window.innerHeight - 160) : 0,
    left: mapCtxMenu ? Math.min(mapCtxMenu.x + (mapContainer.current?.getBoundingClientRect().left || 0), window.innerWidth - 210) : 0,
    width: 200,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 3000,
    padding: '4px 0',
    overflow: 'hidden',
  }

  const ctxItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '7px 12px',
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
  }

  return (
    <div className="map-container">
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <div className="coord-readout">
        {coords.lng}, {coords.lat}
      </div>

      {mapCtxMenu && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 2999 }}
            onClick={() => setMapCtxMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setMapCtxMenu(null) }}
          />
          <div style={ctxMenuStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '5px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Map Actions
            </div>
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />

            {/* Copy coordinates */}
            <button
              style={ctxItemStyle}
              onClick={() => {
                const text = `${mapCtxMenu.lat.toFixed(6)}, ${mapCtxMenu.lng.toFixed(6)}`
                navigator.clipboard.writeText(text).then(() => {
                  useAppStore.getState().addToast({ type: 'success', message: `Copied: ${text}` })
                })
                setMapCtxMenu(null)
              }}
            >
              <IconCopy size={14} />
              <span>Copy Coordinates</span>
            </button>

            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />

            {/* Measure Distance */}
            <button
              style={measureMode === 'distance' ? { ...ctxItemStyle, color: 'var(--accent-primary)' } : ctxItemStyle}
              onClick={() => {
                setMeasureMode(measureMode === 'distance' ? null : 'distance')
                setMapCtxMenu(null)
              }}
            >
              <IconRuler size={14} />
              <span>{measureMode === 'distance' ? 'Stop Measuring Distance' : 'Measure Distance'}</span>
            </button>

            {/* Measure Area */}
            <button
              style={measureMode === 'area' ? { ...ctxItemStyle, color: 'var(--accent-primary)' } : ctxItemStyle}
              onClick={() => {
                setMeasureMode(measureMode === 'area' ? null : 'area')
                setMapCtxMenu(null)
              }}
            >
              <IconRuler2 size={14} />
              <span>{measureMode === 'area' ? 'Stop Measuring Area' : 'Measure Area'}</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ── Measurement overlay helper ────────────────────────────────────────────────

function updateMeasureOverlay(map, points) {
  const src = map.getSource(MEASURE_SRC)
  if (!src) return

  const features = []

  // Individual points
  for (const pt of points) {
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: pt }, properties: {} })
  }

  // Line connecting them
  if (points.length >= 2) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: points },
      properties: {},
    })
  }

  src.setData({ type: 'FeatureCollection', features })
}
