import * as turf from '@turf/turf'

// ── Measurement ────────────────────────────────────────────────────────────

export function measureArea(geojson) {
  try {
    const area = turf.area(geojson)
    return { m2: area, km2: area / 1e6, acres: area / 4046.86, sqFt: area * 10.7639 }
  } catch { return null }
}

export function measureLength(geojson, units = 'kilometers') {
  try {
    let total = 0
    const features = geojson.features || [geojson]
    for (const f of features) {
      if (f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString') {
        total += turf.length(f, { units })
      }
    }
    return {
      km: total,
      miles: total * 0.621371,
      feet: total * 3280.84,
      meters: total * 1000,
    }
  } catch { return null }
}

export function measureDistance(point1, point2, units = 'kilometers') {
  try {
    const from = turf.point([point1.lng, point1.lat])
    const to   = turf.point([point2.lng, point2.lat])
    const dist = turf.distance(from, to, { units })
    return { km: dist, miles: dist * 0.621371, meters: dist * 1000, feet: dist * 3280.84 }
  } catch { return null }
}

export function getCentroid(geojson) {
  try { return turf.centroid(geojson) } catch { return null }
}

export function getBoundingBox(geojson) {
  try { return turf.bbox(geojson) } catch { return null }
}

// ── Buffer ────────────────────────────────────────────────────────────────

export function buffer(geojson, distance, units = 'kilometers') {
  const featureCount = geojson?.features?.length ?? 0
  if (featureCount === 0) throw new Error('Buffer requires at least one feature — the layer appears to be empty.')
  if (distance === 0) throw new Error('Buffer distance is 0 — enter a non-zero value to expand or shrink features.')
  try {
    const result = turf.buffer(geojson, distance, { units })
    if (!result || !result.features?.length) throw new Error('Buffer produced no output. This can happen with very small or degenerate geometries.')
    return result
  } catch (e) {
    if (e.message.startsWith('Buffer')) throw e
    throw new Error(`Buffer failed: ${e.message}`)
  }
}

// ── Clip / Intersect ──────────────────────────────────────────────────────

export function intersect(fc1, fc2) {
  const polys1 = fc1.features.filter((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
  const polys2 = fc2.features.filter((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
  if (polys1.length === 0) throw new Error('Intersect requires polygon geometry in the active layer — the layer contains no polygons.')
  if (polys2.length === 0) throw new Error('Intersect requires polygon geometry in the second layer — that layer contains no polygons.')
  const results = []
  const errors = []
  for (const f1 of polys1) {
    for (const f2 of polys2) {
      try {
        const result = turf.intersect(turf.featureCollection([f1, f2]))
        if (result) results.push(result)
      } catch (e) {
        errors.push(e.message)
      }
    }
  }
  if (results.length === 0) {
    const detail = errors.length ? ` Internal errors: ${[...new Set(errors)].join('; ')}` : ''
    throw new Error(`Intersect produced no overlapping areas — the layers may not overlap, or the geometries may be invalid.${detail}`)
  }
  return { type: 'FeatureCollection', features: results }
}

export function difference(fc1, fc2) {
  const polys1 = fc1.features.filter((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
  const polys2 = fc2.features.filter((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
  if (polys1.length === 0) throw new Error('Difference requires polygon geometry in the active layer — the layer contains no polygons.')
  if (polys2.length === 0) throw new Error('Difference requires polygon geometry in the second layer — that layer contains no polygons.')
  const results = []
  for (const f1 of polys1) {
    let diff = f1
    for (const f2 of polys2) {
      try {
        const result = turf.difference(turf.featureCollection([diff, f2]))
        if (result) diff = result
      } catch {}
    }
    results.push(diff)
  }
  return { type: 'FeatureCollection', features: results }
}

// ── Union / Dissolve ──────────────────────────────────────────────────────

export function union(fc) {
  const polys = fc.features.filter(
    (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
  )
  if (polys.length === 0) throw new Error('Union requires polygon geometry — the active layer contains no polygons.')
  try {
    let merged = polys[0]
    const errors = []
    for (let i = 1; i < polys.length; i++) {
      try { merged = turf.union(turf.featureCollection([merged, polys[i]])) } catch (e) { errors.push(e.message) }
    }
    if (errors.length) console.warn('[GIS] union partial errors:', errors)
    return { type: 'FeatureCollection', features: [merged] }
  } catch (e) {
    throw new Error(`Union failed: ${e.message}`)
  }
}

export function dissolveByField(fc, field) {
  const hasField = fc.features.some((f) => field in (f.properties || {}))
  if (!hasField) throw new Error(`Dissolve field "${field}" was not found in any feature's properties.`)
  try {
    return turf.dissolve(fc, { propertyName: field })
  } catch (e) {
    throw new Error(`Dissolve failed: ${e.message}. Ensure the layer contains only polygon geometry.`)
  }
}

// ── Simplify ──────────────────────────────────────────────────────────────

export function simplify(geojson, tolerance = 0.01, highQuality = false) {
  if (!geojson?.features?.length) throw new Error('Simplify requires at least one feature — the layer is empty.')
  try {
    return turf.simplify(geojson, { tolerance, highQuality })
  } catch (e) {
    throw new Error(`Simplify failed: ${e.message}`)
  }
}

// ── Convex Hull ───────────────────────────────────────────────────────────

export function convexHull(fc) {
  if (!fc?.features?.length) throw new Error('Convex Hull requires at least one feature — the layer is empty.')
  try {
    const hull = turf.convex(fc)
    if (!hull) throw new Error('Convex Hull could not be computed — this can happen when all features are collinear or the layer has fewer than 3 distinct points.')
    return { type: 'FeatureCollection', features: [hull] }
  } catch (e) {
    if (e.message.startsWith('Convex')) throw e
    throw new Error(`Convex Hull failed: ${e.message}`)
  }
}

// ── Voronoi ───────────────────────────────────────────────────────────────

export function voronoi(fc, bboxPad = 0.1) {
  const points = fc.features.filter((f) => f.geometry?.type === 'Point')
  if (points.length === 0) throw new Error('Voronoi requires a point layer — the active layer contains no point features.')
  if (points.length < 3) throw new Error(`Voronoi requires at least 3 points — the layer only has ${points.length}.`)
  try {
    const bbox = turf.bbox({ type: 'FeatureCollection', features: points })
    const paddedBbox = [
      bbox[0] - bboxPad, bbox[1] - bboxPad,
      bbox[2] + bboxPad, bbox[3] + bboxPad,
    ]
    const result = turf.voronoi({ type: 'FeatureCollection', features: points }, { bbox: paddedBbox })
    if (!result?.features?.length) throw new Error('Voronoi produced no polygons. Check that the points are not all identical.')
    return result
  } catch (e) {
    if (e.message.startsWith('Voronoi')) throw e
    throw new Error(`Voronoi failed: ${e.message}`)
  }
}

// ── Centroid of each feature ──────────────────────────────────────────────

export function centroidsOf(fc) {
  const features = fc.features.map((f) => {
    try {
      const c = turf.centroid(f)
      return { ...c, properties: { ...f.properties } }
    } catch { return null }
  }).filter(Boolean)
  return { type: 'FeatureCollection', features }
}

// ── Point in Polygon join ─────────────────────────────────────────────────

export function pointsInPolygon(points, polygons) {
  const matching = []
  for (const pt of points.features) {
    for (const poly of polygons.features) {
      try {
        if (turf.booleanPointInPolygon(pt, poly)) {
          matching.push({
            ...pt,
            properties: { ...pt.properties, ...poly.properties },
          })
          break
        }
      } catch {}
    }
  }
  return { type: 'FeatureCollection', features: matching }
}

// ── Nearest Neighbor ──────────────────────────────────────────────────────

export function nearestNeighbor(sourceFC, targetFC) {
  const results = []
  for (const pt of sourceFC.features) {
    try {
      const nearest = turf.nearestPoint(pt, targetFC)
      results.push({
        ...pt,
        properties: {
          ...pt.properties,
          nearest_dist_km: nearest.properties.distanceToPoint,
          ...Object.fromEntries(
            Object.entries(nearest.properties).map(([k, v]) => [`nearest_${k}`, v])
          ),
        },
      })
    } catch {}
  }
  return { type: 'FeatureCollection', features: results }
}

// ── Flip coordinates (lat/lng swap) ──────────────────────────────────────

export function flipCoords(fc) {
  const features = fc.features.map((f) => {
    if (!f.geometry) return f
    return {
      ...f,
      geometry: turf.flip(f).geometry,
    }
  })
  return { type: 'FeatureCollection', features }
}

// ── Statistics helpers ────────────────────────────────────────────────────

export function getFieldStats(fc, field) {
  const values = fc.features
    .map((f) => f.properties?.[field])
    .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)))
    .map(Number)

  if (!values.length) return null

  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((a, b) => a + b, 0)
  const mean = sum / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length

  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    sum,
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    stddev: Math.sqrt(variance),
    q1: sorted[Math.floor(sorted.length * 0.25)],
    q3: sorted[Math.floor(sorted.length * 0.75)],
  }
}

export function getUniqueValues(fc, field) {
  const seen = new Set()
  for (const f of fc.features) {
    const v = f.properties?.[field]
    if (v !== null && v !== undefined) seen.add(v)
  }
  return [...seen].sort()
}

// ── Classification / Color ramp ───────────────────────────────────────────

export function classifyQuantile(fc, field, numClasses = 5) {
  const stats = getFieldStats(fc, field)
  if (!stats) return []
  const values = fc.features
    .map((f) => Number(f.properties?.[field]))
    .filter((v) => !isNaN(v))
    .sort((a, b) => a - b)

  const breaks = []
  for (let i = 1; i < numClasses; i++) {
    const idx = Math.floor((i / numClasses) * values.length)
    breaks.push(values[idx])
  }
  return [values[0], ...breaks, values[values.length - 1]]
}

export function classifyEqualInterval(fc, field, numClasses = 5) {
  const stats = getFieldStats(fc, field)
  if (!stats) return []
  const step = (stats.max - stats.min) / numClasses
  const breaks = []
  for (let i = 0; i <= numClasses; i++) {
    breaks.push(stats.min + step * i)
  }
  return breaks
}
