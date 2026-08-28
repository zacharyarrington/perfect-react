// layoutPresets — named panel layout snapshots
// Built-in presets are defined here; user presets live in localStorage.

const USER_PRESETS_KEY = 'readymapgo_layout_presets'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a full panels object with all panels closed, with overrides applied. */
const allClosed = (overrides = {}) => ({
  layers:     { open: false, x: 60,   y: 120, w: 280, h: 420 },
  symbology:  { open: false, x: 310,  y: 70,  w: 320, h: 480 },
  attributes: { open: false, x: 12,   y: 510, w: 700, h: 320 },
  gistools:   { open: false, x: 640,  y: 70,  w: 300, h: 500 },
  filters:    { open: false, x: 310,  y: 70,  w: 340, h: 380 },
  dashboard:  { open: false, x: 12,   y: 70,  w: 560, h: 440 },
  export:     { open: false, x: 200,  y: 100, w: 360, h: 500 },
  mapstyle:   { open: false, x: 12,   y: 70,  w: 280, h: 320 },
  measure:    { open: false, x: 12,   y: 70,  w: 280, h: 200 },
  search:     { open: false, x: 310,  y: 70,  w: 300, h: 380 },
  print:      { open: false, x: 400,  y: 100, w: 320, h: 560 },
  settings:   { open: false, x: 200,  y: 140, w: 300, h: 420 },
  ...overrides,
})

// ── Built-in presets ─────────────────────────────────────────────────────────

export const BUILTIN_PRESETS = [
  {
    id: 'preset_default',
    name: 'Default',
    description: 'Layers panel only',
    builtin: true,
    panels: allClosed({
      layers: { open: true, x: 60, y: 120, w: 280, h: 420 },
    }),
  },
  {
    id: 'preset_editing',
    name: 'Editing',
    description: 'Layers + Measure for drawing workflows',
    builtin: true,
    panels: allClosed({
      layers:  { open: true, x: 60,  y: 80,  w: 280, h: 420 },
      measure: { open: true, x: 360, y: 80,  w: 280, h: 200 },
    }),
  },
  {
    id: 'preset_analysis',
    name: 'Analysis',
    description: 'Filters, Dashboard & Attribute Table',
    builtin: true,
    panels: allClosed({
      layers:     { open: true, x: 60,  y: 80,  w: 280, h: 380 },
      filters:    { open: true, x: 360, y: 80,  w: 340, h: 380 },
      dashboard:  { open: true, x: 60,  y: 480, w: 560, h: 380 },
      attributes: { open: true, x: 640, y: 80,  w: 600, h: 320 },
    }),
  },
  {
    id: 'preset_minimal',
    name: 'Minimal',
    description: 'Clean map — all panels closed',
    builtin: true,
    panels: allClosed(),
  },
]

// ── User presets (localStorage) ───────────────────────────────────────────────

export function listUserPresets() {
  try {
    return JSON.parse(localStorage.getItem(USER_PRESETS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveUserPreset(name, panels) {
  const existing = listUserPresets()
  const id = `preset_user_${Date.now()}`
  const preset = {
    id,
    name: name.trim(),
    panels,
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(USER_PRESETS_KEY, JSON.stringify([...existing, preset]))
  return preset
}

export function deleteUserPreset(id) {
  const updated = listUserPresets().filter((p) => p.id !== id)
  localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(updated))
}
