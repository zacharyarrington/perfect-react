// styleTemplates — named, reusable snapshots of layer style and/or KML export
// settings, so a look you dial in on one layer can be recalled on another.
// Mirrors the layoutPresets.js pattern: plain localStorage, no backend.

const TEMPLATES_KEY = 'readymapgo_style_templates'

// Style keys that are safe to carry between layers. Excludes computed/derived
// state that only makes sense for the field values it was generated from
// (categoricalValues, graduatedBreaks, rules) — those stay behind so applying
// a template doesn't paste stale swatches tied to another layer's data. The
// *settings* that drive them (categoricalField, graduatedField, colorRamp,
// breakMethod, numBreaks) do carry over, since field-name mismatches are
// expected and just have no effect until the field is re-picked or matches.
const STYLE_TEMPLATE_KEYS = [
  'type', 'color', 'strokeColor', 'strokeWidth', 'radius', 'opacity',
  'fillOpacity', 'lineWidth', 'iconType', 'iconSize',
  'labelField', 'popupFields',
  'symbologyMode', 'categoricalField', 'graduatedField',
  'colorRamp', 'numBreaks', 'breakMethod',
]

// KML settings worth templating — everything except the document/folder
// name & description, which are usually specific to one export, and
// sampleFeatureIndex, which only makes sense for the layer it was set on.
const KML_TEMPLATE_KEYS = [
  'pointColor', 'pointScale', 'lineColor', 'lineWidth', 'lineOpacity',
  'fillColor', 'fillOpacity', 'strokeColor', 'strokeWidth', 'strokeOpacity',
  'iconPreset', 'iconUrl', 'featureNameField', 'featureDescriptionField',
  'altitudeMode', 'visibility', 'open', 'tessellate', 'extrude', 'labelScale',
]

function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj?.[k] !== undefined) out[k] = obj[k]
  return out
}

export function extractStyleTemplate(style) {
  return pick(style, STYLE_TEMPLATE_KEYS)
}

export function extractKmlTemplate(kmlExportSettings) {
  return pick(kmlExportSettings, KML_TEMPLATE_KEYS)
}

// ── CRUD (localStorage) ─────────────────────────────────────────────────────

export function listStyleTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Saves a template. `kind` is 'style' | 'kml' — kept on the record so the UI
 * can filter to the relevant list without cross-contaminating pickers.
 */
export function saveStyleTemplate(name, kind, data) {
  const existing = listStyleTemplates()
  const template = {
    id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    kind,
    data,
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify([...existing, template]))
  return template
}

export function deleteStyleTemplate(id) {
  const updated = listStyleTemplates().filter((t) => t.id !== id)
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated))
}

export function renameStyleTemplate(id, name) {
  const updated = listStyleTemplates().map((t) => t.id === id ? { ...t, name: name.trim() } : t)
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated))
}
