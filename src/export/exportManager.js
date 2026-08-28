import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export const KML_ICON_PRESETS = [
  {
    id: 'yellow-dot',
    label: 'Yellow Dot',
    url: 'https://maps.google.com/mapfiles/kml/paddle/ylw-circle.png',
  },
  {
    id: 'red-dot',
    label: 'Red Dot',
    url: 'https://maps.google.com/mapfiles/kml/paddle/red-circle.png',
  },
  {
    id: 'blue-dot',
    label: 'Blue Dot',
    url: 'https://maps.google.com/mapfiles/kml/paddle/blu-circle.png',
  },
  {
    id: 'green-dot',
    label: 'Green Dot',
    url: 'https://maps.google.com/mapfiles/kml/paddle/grn-circle.png',
  },
  {
    id: 'orange-pin',
    label: 'Orange Pin',
    url: 'https://maps.google.com/mapfiles/kml/pushpin/orange-pushpin.png',
  },
  {
    id: 'yellow-pin',
    label: 'Yellow Pin',
    url: 'https://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png',
  },
  {
    id: 'red-pin',
    label: 'Red Pin',
    url: 'https://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png',
  },
  {
    id: 'blue-pin',
    label: 'Blue Pin',
    url: 'https://maps.google.com/mapfiles/kml/pushpin/blue-pushpin.png',
  },
  {
    id: 'placemark-circle',
    label: 'Placemark Circle',
    url: 'https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png',
  },
  {
    id: 'target',
    label: 'Target',
    url: 'https://maps.google.com/mapfiles/kml/shapes/target.png',
  },
]

const DEFAULT_KML_ICON_URL = KML_ICON_PRESETS[0].url

// ── GeoJSON export ────────────────────────────────────────────────────────

export function exportGeoJSON(layer) {
  const json = JSON.stringify(layer.geojson, null, 2)
  downloadBlob(json, `${layer.name}.geojson`, 'application/geo+json')
}

// ── CSV export ────────────────────────────────────────────────────────────

export function exportCSV(layer) {
  const rows = layer.geojson.features.map((f) => {
    const row = { ...f.properties }
    const coords = f.geometry?.coordinates
    if (coords) {
      if (f.geometry.type === 'Point') {
        row.longitude = coords[0]
        row.latitude  = coords[1]
      } else {
        row.geometry_wkt = geometryToWKT(f.geometry)
      }
    }
    return row
  })

  const csv = Papa.unparse(rows)
  downloadBlob(csv, `${layer.name}.csv`, 'text/csv')
}

// ── Excel export ──────────────────────────────────────────────────────────

export function exportExcel(layer) {
  const rows = layer.geojson.features.map((f, i) => {
    const row = { _feature_id: i + 1, ...f.properties }
    const coords = f.geometry?.coordinates
    if (coords) {
      if (f.geometry.type === 'Point') {
        row.longitude = coords[0]
        row.latitude  = coords[1]
      } else {
        row.geometry_wkt = geometryToWKT(f.geometry)
      }
    }
    return row
  })

  const wb = XLSX.utils.book_new()

  // Sheet 1: Attributes
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Attributes')

  // Sheet 2: Layer Info
  const infoWs = XLSX.utils.json_to_sheet([
    { Field: 'Layer Name',    Value: layer.name },
    { Field: 'Type',          Value: layer.type },
    { Field: 'Feature Count', Value: layer.geojson.features.length },
    { Field: 'Exported At',   Value: new Date().toISOString() },
  ])
  XLSX.utils.book_append_sheet(wb, infoWs, 'Layer Info')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  downloadBlob(new Uint8Array(buf), `${layer.name}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

// ── KML export ────────────────────────────────────────────────────────────

export function exportKML(layer, settings = {}) {
  const {
    pointColor     = '#ff0000',
    pointScale     = 1.0,
    lineColor      = '#0000ff',
    lineWidth      = 2,
    lineOpacity    = 1.0,
    fillColor      = '#00ff00',
    fillOpacity    = 0.5,
    strokeColor    = '#000000',
    strokeWidth    = 1,
    strokeOpacity  = 1.0,
    iconPreset     = 'yellow-dot',
    iconUrl        = '',
    documentName   = layer.name,
    folderName     = layer.name,
    documentDescription = '',
    featureNameField = 'auto',
    featureDescriptionField = 'auto',
    altitudeMode   = 'clampToGround',
    visibility     = true,
    open           = true,
    tessellate     = false,
    extrude        = false,
    labelScale     = 0.7,
  } = settings

  // Document Name / Folder Name / Description can reference feature attributes
  // with {fieldName} tokens (e.g. "{city} Parcels"). Resolved against the
  // first feature in the export, or a caller-chosen sample feature.
  const sampleProperties = (settings.sampleFeatureIndex != null
    ? layer.geojson.features[settings.sampleFeatureIndex]
    : layer.geojson.features[0])?.properties || {}
  const resolvedDocumentName = interpolateFields(documentName || layer.name, sampleProperties)
  const resolvedFolderName = interpolateFields(folderName || layer.name, sampleProperties)
  const resolvedDocumentDescription = interpolateFields(documentDescription, sampleProperties)

  const colorToKML = (hex, opacity = 1) => {
    // KML color format: AABBGGRR
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0')
    const r = hex.slice(1, 3)
    const g = hex.slice(3, 5)
    const b = hex.slice(5, 7)
    return `${alpha}${b}${g}${r}`
  }

  const pointKmlColor  = colorToKML(pointColor, 1)
  const lineKmlColor   = colorToKML(lineColor, lineOpacity)
  const fillKmlColor   = colorToKML(fillColor, fillOpacity)
  const strokeKmlColor = colorToKML(strokeColor, strokeOpacity)
  const layerStyleId   = layer.id
  const resolvedIconUrl = resolveKmlIconUrl(iconPreset, iconUrl)
  const visibilityFlag = visibility ? 1 : 0
  const openFlag = open ? 1 : 0

  const styleBlock = `
  <Style id="${layerStyleId}_point">
    <IconStyle>
      <color>${pointKmlColor}</color>
      <scale>${pointScale}</scale>
      <Icon><href>${escapeXML(resolvedIconUrl)}</href></Icon>
    </IconStyle>
    <LabelStyle><scale>${labelScale}</scale></LabelStyle>
  </Style>
  <Style id="${layerStyleId}_line">
    <LineStyle>
      <color>${lineKmlColor}</color>
      <width>${lineWidth}</width>
    </LineStyle>
  </Style>
  <Style id="${layerStyleId}_polygon">
    <LineStyle>
      <color>${strokeKmlColor}</color>
      <width>${strokeWidth}</width>
    </LineStyle>
    <PolyStyle>
      <color>${fillKmlColor}</color>
    </PolyStyle>
  </Style>`

  const featureToKML = (feature, index) => {
    const { geometry, properties } = feature
    if (!geometry) return ''

    const geomType   = geometry.type
    const styleref   = geomType === 'Point' || geomType === 'MultiPoint'
      ? `${layerStyleId}_point`
      : geomType === 'LineString' || geomType === 'MultiLineString'
        ? `${layerStyleId}_line`
        : `${layerStyleId}_polygon`

    const name  = resolveFeatureName(properties, featureNameField, index)
    const desc  = resolveFeatureDescription(properties, featureDescriptionField)

    const extData = Object.entries(properties || {})
      .map(([k, v]) => `      <Data name="${escapeXML(String(k))}"><value>${escapeXML(String(v ?? ''))}</value></Data>`)
      .join('\n')

    const coordsString = coordsToKML(geometry, { altitudeMode, extrude, tessellate })
    if (!coordsString) return ''

    return `
    <Placemark>
      <visibility>${visibilityFlag}</visibility>
      <name>${escapeXML(String(name))}</name>
      <description><![CDATA[${desc}]]></description>
      <styleUrl>#${styleref}</styleUrl>
      <ExtendedData>
${extData}
      </ExtendedData>
      ${coordsString}
    </Placemark>`
  }

  const placemarks = layer.geojson.features
    .map((f, i) => featureToKML(f, i))
    .filter(Boolean)
    .join('\n')

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXML(resolvedDocumentName)}</name>
    <visibility>${visibilityFlag}</visibility>
    <open>${openFlag}</open>
    <description>${escapeXML(resolvedDocumentDescription || `Exported from ReadyMapGo on ${new Date().toISOString()}`)}</description>
    ${styleBlock}
    <Folder>
      <name>${escapeXML(resolvedFolderName)}</name>
      <visibility>${visibilityFlag}</visibility>
      <open>${openFlag}</open>
      ${placemarks}
    </Folder>
  </Document>
</kml>`

  downloadBlob(kml, `${resolvedDocumentName || layer.name}.kml`, 'application/vnd.google-earth.kml+xml')
}

// ── Export all layers as multi-folder KML ─────────────────────────────────

export function exportAllKML(layers, settingsMap = {}) {
  const allFolders = layers.map((layer) => {
    const settings = settingsMap[layer.id] || {}
    // Just get the features portion - we'll compose one document
    const features = layer.geojson.features
    return { layer, features, settings }
  })

  // For simplicity, export individually for now
  allFolders.forEach(({ layer, settings }) => exportKML(layer, settings))
}

// ── Helpers ────────────────────────────────────────────────────────────────

function coordsToKML(geometry, options) {
  const { altitudeMode, extrude, tessellate } = options
  const fmt = (c) => `${c[0]},${c[1]},${c[2] || 0}`
  const ring = (coords) => `<coordinates>${coords.map(fmt).join(' ')}</coordinates>`
  const geometryFlags = `${extrude ? '<extrude>1</extrude>' : ''}${tessellate ? '<tessellate>1</tessellate>' : ''}`

  switch (geometry.type) {
    case 'Point':
      return `<Point>${geometryFlags}<altitudeMode>${altitudeMode}</altitudeMode><coordinates>${fmt(geometry.coordinates)}</coordinates></Point>`

    case 'MultiPoint':
      return geometry.coordinates.map((c) =>
        `<Point>${geometryFlags}<altitudeMode>${altitudeMode}</altitudeMode><coordinates>${fmt(c)}</coordinates></Point>`
      ).join('')

    case 'LineString':
      return `<LineString>${geometryFlags}<altitudeMode>${altitudeMode}</altitudeMode>${ring(geometry.coordinates)}</LineString>`

    case 'MultiLineString':
      return `<MultiGeometry>${geometry.coordinates.map((c) =>
        `<LineString>${geometryFlags}<altitudeMode>${altitudeMode}</altitudeMode>${ring(c)}</LineString>`
      ).join('')}</MultiGeometry>`

    case 'Polygon':
      return `<Polygon>${geometryFlags}<altitudeMode>${altitudeMode}</altitudeMode>
        <outerBoundaryIs><LinearRing>${ring(geometry.coordinates[0])}</LinearRing></outerBoundaryIs>
        ${geometry.coordinates.slice(1).map((inner) =>
          `<innerBoundaryIs><LinearRing>${ring(inner)}</LinearRing></innerBoundaryIs>`
        ).join('')}
      </Polygon>`

    case 'MultiPolygon':
      return `<MultiGeometry>${geometry.coordinates.map((poly) =>
        `<Polygon>${geometryFlags}<altitudeMode>${altitudeMode}</altitudeMode>
          <outerBoundaryIs><LinearRing>${ring(poly[0])}</LinearRing></outerBoundaryIs>
          ${poly.slice(1).map((inner) =>
            `<innerBoundaryIs><LinearRing>${ring(inner)}</LinearRing></innerBoundaryIs>`
          ).join('')}
        </Polygon>`
      ).join('')}</MultiGeometry>`

    default:
      return null
  }
}

// Replaces {fieldName} tokens with the matching value from `properties`.
// Unknown fields are left as-is (and blank/missing values render empty)
// so a typo'd token is still visible in the output rather than silently
// swallowed.
export function interpolateFields(template, properties = {}) {
  if (!template) return template
  return template.replace(/\{([^{}]+)\}/g, (match, field) => {
    const key = field.trim()
    if (!(key in properties)) return match
    const value = properties[key]
    return value == null ? '' : String(value)
  })
}

function resolveKmlIconUrl(iconPreset, iconUrl) {
  if (iconUrl?.trim()) return iconUrl.trim()
  return KML_ICON_PRESETS.find((preset) => preset.id === iconPreset)?.url || DEFAULT_KML_ICON_URL
}

function resolveFeatureName(properties, featureNameField, index) {
  if (featureNameField && featureNameField !== 'auto' && featureNameField !== 'none') {
    return properties?.[featureNameField] ?? `Feature ${index + 1}`
  }
  if (featureNameField === 'none') return `Feature ${index + 1}`
  return properties?._name || properties?.name || properties?.NAME || `Feature ${index + 1}`
}

function resolveFeatureDescription(properties, featureDescriptionField) {
  if (featureDescriptionField === 'none') return ''
  if (featureDescriptionField && featureDescriptionField !== 'auto') {
    return properties?.[featureDescriptionField] ?? ''
  }
  return properties?._description || properties?.description || ''
}

function geometryToWKT(geometry) {
  if (!geometry) return ''
  switch (geometry.type) {
    case 'Point':
      return `POINT(${geometry.coordinates.join(' ')})`
    case 'LineString':
      return `LINESTRING(${geometry.coordinates.map((c) => c.join(' ')).join(', ')})`
    case 'Polygon':
      return `POLYGON((${geometry.coordinates[0].map((c) => c.join(' ')).join(', ')}))`
    default:
      return JSON.stringify(geometry)
  }
}

function escapeXML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function downloadBlob(content, filename, mimeType) {
  const blob = content instanceof Uint8Array
    ? new Blob([content], { type: mimeType })
    : new Blob([content], { type: mimeType + ';charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
