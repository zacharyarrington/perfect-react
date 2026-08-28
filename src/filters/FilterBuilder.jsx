// FilterBuilder — standalone filter logic module
// Applies filter rules to a GeoJSON FeatureCollection in-memory
// (separate from the Mapbox GL filter expressions which handle map rendering)

/**
 * Evaluate a single filter rule against a feature's properties.
 */
export function evaluateRule(rule, properties) {
  const { field, operator, value } = rule
  if (!field || !operator) return true

  const propVal = properties?.[field]

  switch (operator) {
    case '=':        return String(propVal) === String(value)
    case '!=':       return String(propVal) !== String(value)
    case '>':        return Number(propVal) > Number(value)
    case '>=':       return Number(propVal) >= Number(value)
    case '<':        return Number(propVal) < Number(value)
    case '<=':       return Number(propVal) <= Number(value)
    case 'contains': return String(propVal ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'starts':   return String(propVal ?? '').toLowerCase().startsWith(String(value).toLowerCase())
    case 'is null':  return propVal === null || propVal === undefined
    case 'not null': return propVal !== null && propVal !== undefined
    default:         return true
  }
}

/**
 * Apply an array of filter rules to a GeoJSON FeatureCollection.
 * Returns a filtered FeatureCollection (features that pass all/any rules).
 */
export function applyFilters(featureCollection, filters) {
  if (!filters || filters.length === 0) return featureCollection

  const logic = filters[0]?.groupLogic || 'all'

  const filtered = featureCollection.features.filter((feature) => {
    const props = feature.properties || {}
    if (logic === 'or') {
      return filters.some((rule) => evaluateRule(rule, props))
    }
    return filters.every((rule) => evaluateRule(rule, props))
  })

  return { ...featureCollection, features: filtered }
}

/**
 * Get the count of features that pass the current filters.
 */
export function getFilteredCount(featureCollection, filters) {
  if (!filters || filters.length === 0) return featureCollection.features.length
  return applyFilters(featureCollection, filters).features.length
}

/**
 * Get unique values for a given field across a FeatureCollection.
 */
export function getFieldValues(featureCollection, field) {
  const values = new Set()
  for (const f of featureCollection.features) {
    const v = f.properties?.[field]
    if (v !== null && v !== undefined) values.add(v)
  }
  return [...values].sort()
}

/**
 * Detect the type of a field (string, number, boolean, null).
 */
export function detectFieldType(featureCollection, field) {
  for (const f of featureCollection.features) {
    const v = f.properties?.[field]
    if (v !== null && v !== undefined) {
      if (typeof v === 'number') return 'number'
      if (typeof v === 'boolean') return 'boolean'
      return 'string'
    }
  }
  return 'string'
}

/**
 * Get the min/max for a numeric field.
 */
export function getFieldRange(featureCollection, field) {
  const values = featureCollection.features
    .map((f) => Number(f.properties?.[field]))
    .filter((v) => !isNaN(v))
  if (!values.length) return { min: 0, max: 0 }
  return { min: Math.min(...values), max: Math.max(...values) }
}
