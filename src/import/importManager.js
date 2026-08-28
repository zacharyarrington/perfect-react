import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { kml as kmlToGeoJSON } from '@tmcw/togeojson'
import shp from 'shpjs'
import JSZip from 'jszip'

// ── Helpers ────────────────────────────────────────────────────────────────

function detectGeometryType(geojson) {
  const types = new Set()
  for (const f of geojson.features) {
    if (f.geometry) types.add(f.geometry.type)
  }
  if (types.size === 0) return 'unknown'
  const hasPoint   = types.has('Point') || types.has('MultiPoint')
  const hasLine    = types.has('LineString') || types.has('MultiLineString')
  const hasPoly    = types.has('Polygon') || types.has('MultiPolygon')
  if (hasPoint && !hasLine && !hasPoly) return 'point'
  if (hasLine && !hasPoint && !hasPoly) return 'line'
  if (hasPoly && !hasPoint && !hasLine) return 'polygon'
  return 'mixed'
}

function cleanGeoJSON(geojson) {
  // Ensure we have a proper FeatureCollection
  if (geojson.type === 'Feature') {
    geojson = { type: 'FeatureCollection', features: [geojson] }
  }
  if (!geojson.features) geojson.features = []

  // Clean null geometries and ensure properties exist
  geojson.features = geojson.features
    .filter((f) => f && f.geometry)
    .map((f) => ({
      ...f,
      properties: f.properties || {},
    }))

  return geojson
}

function csvRowsToGeoJSON(rows, latField, lngField) {
  const features = []
  for (const row of rows) {
    const lat = parseFloat(row[latField])
    const lng = parseFloat(row[lngField])
    if (isNaN(lat) || isNaN(lng)) continue
    const properties = { ...row }
    delete properties[latField]
    delete properties[lngField]
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties,
    })
  }
  return { type: 'FeatureCollection', features }
}

function detectLatLngFields(row) {
  const keys = Object.keys(row).map((k) => k.toLowerCase().trim())
  const latCandidates = ['latitude', 'lat', 'y', 'ylat', 'lat_dd', 'latitude_dd']
  const lngCandidates = ['longitude', 'lon', 'lng', 'long', 'x', 'xlong', 'lng_dd', 'longitude_dd']

  let latKey = null, lngKey = null
  const origKeys = Object.keys(row)

  for (const cand of latCandidates) {
    const idx = keys.indexOf(cand)
    if (idx !== -1) { latKey = origKeys[idx]; break }
  }
  for (const cand of lngCandidates) {
    const idx = keys.indexOf(cand)
    if (idx !== -1) { lngKey = origKeys[idx]; break }
  }

  return { latKey, lngKey }
}

function getMissingCoordinateFieldsMessage(columns) {
  return (
    `Could not find latitude/longitude columns.\n` +
    `Expected columns like: latitude, lat, y / longitude, lon, lng, x\n` +
    `Found columns: ${columns.join(', ')}`
  )
}

function validateCoordinateSelection(columns, latKey, lngKey) {
  if (!latKey || !lngKey) {
    throw new Error(getMissingCoordinateFieldsMessage(columns))
  }
  if (latKey === lngKey) {
    throw new Error('Latitude and longitude columns must be different.')
  }
  if (!columns.includes(latKey) || !columns.includes(lngKey)) {
    throw new Error('Selected coordinate columns were not found in the imported file.')
  }
}

function rowsToPointGeoJSON(rows, latKey, lngKey, sourceLabel) {
  const geojson = csvRowsToGeoJSON(rows, latKey, lngKey)
  if (geojson.features.length === 0) {
    throw new Error(
      `No valid coordinates found in ${sourceLabel}.\n` +
      `Checked columns: "${latKey}" (latitude) and "${lngKey}" (longitude).\n` +
      `All ${rows.length} row(s) had missing or non-numeric coordinate values.`
    )
  }
  return geojson
}

async function parseTabularRows(file, ext) {
  if (ext === 'csv') {
    const text = await file.text()
    const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true })
    if (result.errors.length > 0) {
      console.warn('[Import] CSV parse warnings:', result.errors)
    }
    if (!result.data.length) throw new Error('CSV is empty')
    return result.data
  }

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName])
  if (!rows.length) throw new Error('Spreadsheet is empty')
  return rows
}

async function resolveCoordinateFields({
  file,
  rows,
  columns,
  coordinateFields,
  selectCoordinateFields,
}) {
  let latKey = coordinateFields?.latKey ?? null
  let lngKey = coordinateFields?.lngKey ?? null

  if (!latKey || !lngKey) {
    const detectedFields = detectLatLngFields(rows[0] || {})
    latKey = latKey || detectedFields.latKey
    lngKey = lngKey || detectedFields.lngKey
  }

  if (selectCoordinateFields) {
    const selection = await selectCoordinateFields({
      fileName: file.name,
      columns,
      suggestedLatKey: latKey,
      suggestedLngKey: lngKey,
      sampleRows: rows.slice(0, 5),
    })
    latKey = selection?.latKey ?? null
    lngKey = selection?.lngKey ?? null
  }

  validateCoordinateSelection(columns, latKey, lngKey)
  return { latKey, lngKey }
}

// ── Main Import Function ───────────────────────────────────────────────────

export async function importFile(file, options = {}) {
  const ext = file.name.split('.').pop().toLowerCase()
  const name = file.name.replace(/\.[^.]+$/, '')

  let geojson
  let layerType

  try {
    switch (ext) {
      case 'geojson':
      case 'json': {
        const text = await file.text()
        geojson = JSON.parse(text)
        break
      }

      case 'kml': {
        const text = await file.text()
        const dom = new DOMParser().parseFromString(text, 'text/xml')
        geojson = kmlToGeoJSON(dom)
        break
      }

      case 'kmz': {
        const buffer = await file.arrayBuffer()
        // KMZ is a zip containing a KML
        const zip = await JSZip.loadAsync(buffer)
        const kmlFile = Object.values(zip.files).find((f) =>
          f.name.toLowerCase().endsWith('.kml')
        )
        if (!kmlFile) throw new Error('No KML file found in KMZ archive')
        const kmlText = await kmlFile.async('text')
        const dom = new DOMParser().parseFromString(kmlText, 'text/xml')
        geojson = kmlToGeoJSON(dom)
        break
      }

      case 'zip': {
        // Assume shapefile zip
        const buffer = await file.arrayBuffer()
        geojson = await shp(buffer)
        // shpjs can return array of FeatureCollections
        if (Array.isArray(geojson)) {
          geojson = {
            type: 'FeatureCollection',
            features: geojson.flatMap((fc) => fc.features || []),
          }
        }
        break
      }

      case 'csv': {
        const rows = await parseTabularRows(file, ext)
        const columns = Object.keys(rows[0] || {})
        const { latKey, lngKey } = await resolveCoordinateFields({
          file,
          rows,
          columns,
          coordinateFields: options.coordinateFields,
          selectCoordinateFields: options.selectCoordinateFields,
        })
        geojson = rowsToPointGeoJSON(rows, latKey, lngKey, 'CSV')
        break
      }

      case 'xlsx':
      case 'xls': {
        const rows = await parseTabularRows(file, ext)
        const columns = Object.keys(rows[0] || {})
        const { latKey, lngKey } = await resolveCoordinateFields({
          file,
          rows,
          columns,
          coordinateFields: options.coordinateFields,
          selectCoordinateFields: options.selectCoordinateFields,
        })
        geojson = rowsToPointGeoJSON(rows, latKey, lngKey, 'spreadsheet')
        break
      }

      default:
        throw new Error(`Unsupported file type: .${ext}`)
    }

    geojson = cleanGeoJSON(geojson)
    layerType = detectGeometryType(geojson)

    return {
      name,
      geojson,
      type: layerType,
      featureCount: geojson.features.length,
    }
  } catch (err) {
    console.error('[Import] Error:', err)
    throw err
  }
}

// ── Supported formats list ────────────────────────────────────────────────

export const SUPPORTED_FORMATS = [
  { ext: 'geojson', label: 'GeoJSON', accept: '.geojson,.json' },
  { ext: 'kml',     label: 'KML',     accept: '.kml' },
  { ext: 'kmz',     label: 'KMZ',     accept: '.kmz' },
  { ext: 'zip',     label: 'Shapefile (.zip)', accept: '.zip' },
  { ext: 'csv',     label: 'CSV',     accept: '.csv' },
  { ext: 'xlsx',    label: 'Excel',   accept: '.xlsx,.xls' },
]

export const ACCEPT_STRING = SUPPORTED_FORMATS.map((f) => f.accept).join(',')

// ── Bounding box helper ───────────────────────────────────────────────────

function flattenCoords(geometry) {
  switch (geometry.type) {
    case 'Point':           return [geometry.coordinates]
    case 'MultiPoint':
    case 'LineString':      return geometry.coordinates
    case 'MultiLineString':
    case 'Polygon':         return geometry.coordinates.flat(1)
    case 'MultiPolygon':    return geometry.coordinates.flat(2)
    default:                return []
  }
}

export function computeBbox(geojson) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  for (const f of geojson.features ?? []) {
    if (!f.geometry) continue
    for (const [lng, lat] of flattenCoords(f.geometry)) {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }
  return minLng === Infinity ? null : [minLng, minLat, maxLng, maxLat]
}
