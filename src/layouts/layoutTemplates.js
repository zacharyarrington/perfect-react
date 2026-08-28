// layoutTemplates — named workspace snapshots (panel layout + sidebar + theme)
// that can be saved, applied, and shared as JSON files between people or
// deployments of this template.

import localforage from 'localforage'
import useAppStore from '../store/useAppStore'
import { DEFAULT_PANELS } from '../config/panels.config'

const TEMPLATES_KEY = 'appshell_layout_templates'
const FILE_KIND = 'appshell-layout-template'

// ── Built-ins ────────────────────────────────────────────────────────────────

const allClosed = () =>
  Object.fromEntries(
    Object.entries(DEFAULT_PANELS).map(([k, p]) => [k, { ...p, open: false }])
  )

export const BUILTIN_TEMPLATES = [
  {
    id: 'builtin_default',
    name: 'Default',
    description: 'Registry defaults',
    builtin: true,
    layout: { panels: DEFAULT_PANELS, sidebarCollapsed: false },
  },
  {
    id: 'builtin_minimal',
    name: 'Minimal',
    description: 'All panels closed, sidebar collapsed',
    builtin: true,
    layout: { panels: allClosed(), sidebarCollapsed: true },
  },
]

// ── CRUD (user templates in localforage) ─────────────────────────────────────

export async function listTemplates() {
  const data = await localforage.getItem(TEMPLATES_KEY) || {}
  return Object.values(data).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

/** Snapshot the current workspace under `name`. */
export async function saveTemplate(name, description = '') {
  if (!name?.trim()) throw new Error('Template name is required')
  const s = useAppStore.getState()
  const template = {
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    layout: {
      panels: s.panels,
      sidebarCollapsed: s.sidebarCollapsed,
      theme: s.theme,
    },
  }
  const data = await localforage.getItem(TEMPLATES_KEY) || {}
  data[template.id] = template
  await localforage.setItem(TEMPLATES_KEY, data)
  return template
}

export async function deleteTemplate(id) {
  const data = await localforage.getItem(TEMPLATES_KEY) || {}
  delete data[id]
  await localforage.setItem(TEMPLATES_KEY, data)
}

// ── Apply ────────────────────────────────────────────────────────────────────

export function applyTemplate(template) {
  const { layout } = template
  if (!layout) throw new Error('Template has no layout')
  const store = useAppStore.getState()
  if (layout.panels) {
    // Merge over current panels so keys added since the template was saved
    // keep their defaults instead of disappearing.
    useAppStore.setState((s) => ({ panels: { ...s.panels, ...layout.panels } }))
  }
  if (layout.sidebarCollapsed != null) store.setSidebarCollapsed(layout.sidebarCollapsed)
  if (layout.theme) store.setTheme(layout.theme)
}

// ── Share: export / import as JSON files ─────────────────────────────────────

export function exportTemplate(template) {
  const payload = { kind: FILE_KIND, version: 1, template: { ...template, builtin: undefined } }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${template.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'layout'}.layout.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importTemplateFromFile(file) {
  const text = await file.text()
  const payload = JSON.parse(text)
  if (payload.kind !== FILE_KIND || !payload.template?.layout) {
    throw new Error('Not a layout template file')
  }
  const template = {
    ...payload.template,
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, // fresh id — never collide
    builtin: false,
    importedAt: new Date().toISOString(),
  }
  const data = await localforage.getItem(TEMPLATES_KEY) || {}
  data[template.id] = template
  await localforage.setItem(TEMPLATES_KEY, data)
  return template
}
