// geojsonUtils — small GeoJSON helpers shared by the map module.

/** Dominant geometry type of a FeatureCollection: point | line | polygon | mixed */
export function detectGeomType(geojson) {
  const types = new Set(
    (geojson.features || []).map((f) => {
      const t = f.geometry?.type || ''
      if (t.includes('Point')) return 'point'
      if (t.includes('LineString')) return 'line'
      if (t.includes('Polygon')) return 'polygon'
      return 'other'
    })
  )
  types.delete('other')
  if (types.size === 1) return [...types][0]
  return 'mixed'
}

/** [minLng, minLat, maxLng, maxLat] of every coordinate in the collection. */
export function computeBounds(geojson) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      minLng = Math.min(minLng, coords[0]); maxLng = Math.max(maxLng, coords[0])
      minLat = Math.min(minLat, coords[1]); maxLat = Math.max(maxLat, coords[1])
    } else {
      coords.forEach(walk)
    }
  }
  for (const f of geojson.features || []) {
    if (f.geometry?.coordinates) walk(f.geometry.coordinates)
  }
  if (!isFinite(minLng)) return null
  return [minLng, minLat, maxLng, maxLat]
}
