// inferFields — derives a { key, label, type } schema from a sample of rows.
// Shared by every provider (mock now; CSV import in a later stage) so field
// dropdowns in widget config forms always see the same shape regardless of
// where the rows actually came from.

function titleCase(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
}

function inferType(values) {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '')
  if (nonNull.length === 0) return 'string'
  if (nonNull.every((v) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))))) {
    return 'number'
  }
  if (nonNull.every((v) => typeof v === 'boolean')) return 'boolean'
  if (nonNull.every((v) => typeof v === 'string' && !Number.isNaN(Date.parse(v)) && /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v))) {
    return 'date'
  }
  return 'string'
}

/** Infers a field schema from up to `sampleSize` rows of an array of plain objects. */
export function inferFields(rows, sampleSize = 50) {
  if (!rows?.length) return []
  const sample = rows.slice(0, sampleSize)
  const keys = new Set()
  for (const row of sample) {
    for (const k of Object.keys(row)) keys.add(k)
  }
  return Array.from(keys).map((key) => ({
    key,
    label: titleCase(key),
    type: inferType(sample.map((r) => r[key])),
  }))
}
