// MapView — embeddable Mapbox GL map component.
//
//   <MapView />                          full-featured (controls, legend, basemap picker)
//   <MapView showLegend={false} />       opt out of any overlay
//
// Layers come from useMapStore (see useMapStore.js) — add/remove/style layers
// from anywhere and every mounted MapView stays in sync. Requires a Mapbox
// token in .env: VITE_MAPBOX_TOKEN (a friendly setup card renders without one).

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import useMapStore from './useMapStore'
import useMapSync from './useMapSync'
import { buildMapboxLayers } from './LayerRenderer'
import Legend from './Legend'
import BasemapMenu from './BasemapMenu'
import { IconMapOff } from '@tabler/icons-react'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
mapboxgl.accessToken = TOKEN

function TokenMissingCard() {
  return (
    <div className="map-token-missing">
      <div className="empty-state">
        <div className="empty-state-icon"><IconMapOff size={40} /></div>
        <div className="empty-state-title">Mapbox token not configured</div>
        <div className="empty-state-desc" style={{ maxWidth: 380 }}>
          Create a free token at <strong>account.mapbox.com</strong>, then add it to a
          <code>.env</code> file in the project root:
        </div>
        <code style={{ padding: '6px 12px' }}>VITE_MAPBOX_TOKEN=pk.your_token_here</code>
        <div className="empty-state-desc">Restart the dev server after saving.</div>
      </div>
    </div>
  )
}

export default function MapView({
  showControls = true,
  showLegend = true,
  showBasemapPicker = true,
  showCoords = true,
  interactive = true,
  className = '',
}) {
  const mapContainer  = useRef(null)
  const mapRef        = useRef(null)
  const prevLayersRef = useRef([])
  const [coords, setCoords] = useState(null)
  const [mapReady, setMapReady] = useState(false)

  const pendingFitBounds = useMapStore((s) => s.pendingFitBounds)

  // Keep layers/style/selection in sync with the store
  useMapSync(mapRef, prevLayersRef)

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!TOKEN || mapRef.current || !mapContainer.current) return
    const s = useMapStore.getState()

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: s.mapStyle,
      center: s.mapCenter,
      zoom: s.mapZoom,
      projection: 'globe',
      interactive,
      attributionControl: true,
    })
    mapRef.current = map

    if (showControls && interactive) {
      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-left')
      map.addControl(new mapboxgl.ScaleControl(), 'bottom-left')
      map.addControl(new mapboxgl.FullscreenControl(), 'top-left')
    }

    // Persist camera position into the store (so remounts restore it)
    map.on('moveend', () => {
      const c = map.getCenter()
      useMapStore.getState().setMapView([c.lng, c.lat], map.getZoom())
    })

    if (showCoords) {
      map.on('mousemove', (e) => {
        setCoords({ lng: e.lngLat.lng.toFixed(5), lat: e.lngLat.lat.toFixed(5) })
      })
    }

    // ── Hover popup — shows feature properties ────────────────────────────
    const hoverPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'map-hover-popup',
      maxWidth: '280px',
      offset: 12,
    })

    map.on('mousemove', (e) => {
      const { layers: currentLayers } = useMapStore.getState()
      const mbLayerIds = currentLayers
        .filter((l) => l.visible !== false)
        .flatMap((l) => buildMapboxLayers(l).map((ml) => ml.id))
        .filter((id) => map.getLayer(id))

      if (!mbLayerIds.length) { map.getCanvas().style.cursor = ''; hoverPopup.remove(); return }

      const features = map.queryRenderedFeatures(e.point, { layers: mbLayerIds })
      if (!features.length) { map.getCanvas().style.cursor = ''; hoverPopup.remove(); return }

      map.getCanvas().style.cursor = 'pointer'

      const f = features[0]
      const match = currentLayers.find((l) =>
        buildMapboxLayers(l).some((ml) => ml.id === f.layer?.id)
      )
      if (!match) return

      const props = f.properties || {}
      // popupFields: null = all properties (capped), [] = popup disabled, [..] = those fields
      const fields = match.style?.popupFields === null || match.style?.popupFields === undefined
        ? Object.keys(props).slice(0, 6)
        : match.style.popupFields
      const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const rows = fields
        .filter((field) => props[field] !== undefined && props[field] !== null && props[field] !== '')
        .map((field) => `<tr><td class="map-popup-key">${esc(field)}</td><td class="map-popup-val">${esc(props[field])}</td></tr>`)
        .join('')

      if (!rows) { hoverPopup.remove(); return }

      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(`<div class="map-popup-header">${esc(match.name)}</div><table class="map-popup-table">${rows}</table>`)
        .addTo(map)
    })

    map.on('mouseleave', () => {
      map.getCanvas().style.cursor = ''
      hoverPopup.remove()
    })

    // ── Click to select ───────────────────────────────────────────────────
    map.on('click', (e) => {
      const { layers: currentLayers, setSelectedFeatures } = useMapStore.getState()
      const mbLayerIds = currentLayers
        .filter((l) => l.visible !== false)
        .flatMap((l) => buildMapboxLayers(l).map((ml) => ml.id))
        .filter((id) => map.getLayer(id))
      if (!mbLayerIds.length) { setSelectedFeatures([]); return }

      const features = map.queryRenderedFeatures(e.point, { layers: mbLayerIds })
      if (!features.length) { setSelectedFeatures([]); return }

      const f = features[0]
      const match = currentLayers.find((l) =>
        buildMapboxLayers(l).some((ml) => ml.id === f.layer?.id)
      )
      if (!match) return
      // Find the feature index by identity of properties + geometry type
      const idx = match.geojson.features.findIndex(
        (gf) => JSON.stringify(gf.properties) === JSON.stringify(f.properties)
      )
      if (idx >= 0) setSelectedFeatures([{ layerId: match.id, featureIndex: idx }])
    })

    map.on('load', () => setMapReady(true))

    return () => {
      hoverPopup.remove()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- init once; options are mount-time only

  // ── Fit bounds requests (e.g. "zoom to layer" from the Layers panel) ──────
  useEffect(() => {
    if (!pendingFitBounds || !mapRef.current) return
    try {
      mapRef.current.fitBounds(pendingFitBounds, { padding: 60, duration: 800, maxZoom: 14 })
    } catch { /* invalid bounds — ignore */ }
    useMapStore.getState().clearPendingFitBounds()
  }, [pendingFitBounds])

  if (!TOKEN) return <TokenMissingCard />

  return (
    <div className={`map-view ${className}`}>
      <div ref={mapContainer} className="map-canvas" />
      {mapReady && showLegend && <Legend />}
      {mapReady && showBasemapPicker && (
        <div className="map-basemap-control">
          <BasemapMenu />
        </div>
      )}
      {showCoords && coords && (
        <div className="map-coord-readout mono">
          {coords.lng}, {coords.lat}
        </div>
      )}
    </div>
  )
}
