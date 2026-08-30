// dashboardTemplates — save/apply/export/import whole dashboards, mirroring
// src/layouts/layoutTemplates.js exactly (localforage blob, list/save/
// delete/apply/export/importFromFile, {kind, version, template} file
// envelope, fresh id on import) — with a withDashboardsTemplatesLock guard
// that layoutTemplates.js itself is missing, since clone/delete here have
// the same read-modify-write race that caused real data loss in
// userManager.js before it had this guard.
//
// applyDashboardTemplate/importDashboardTemplateFromFile regenerate EVERY
// widget id, not just the dashboard id — importing the same file twice must
// never produce two dashboards whose widgets share layout.i values, which
// would make react-grid-layout address the wrong element.
//
// Export embeds both the live widget bindings and a capped CSV-only data
// snapshot (see dataSnapshot.js) so a shared dashboard isn't blank on
// arrival even when the recipient doesn't have the same imported files.

import localforage from 'localforage'
import useDashboardStore from './useDashboardStore'
import { buildDataSnapshot, resolveBindingsAgainstSnapshot } from '../dataSources/dataSnapshot'
import { listAllSources } from '../dataSources/registry'

const TEMPLATES_KEY = 'appshell_dashboard_templates'
const FILE_KIND = 'appshell-dashboard'

let templatesLock = Promise.resolve()
function withTemplatesLock(fn) {
  const result = templatesLock.then(fn)
  templatesLock = result.catch(() => {})
  return result
}

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// ── CRUD ─────────────────────────────────────────────────────────────────

export async function listDashboardTemplates() {
  const data = (await localforage.getItem(TEMPLATES_KEY)) || {}
  return Object.values(data).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

/** Snapshots dashboard `dashboardId` (by value — the current template is a point-in-time copy) under `name`. */
export async function saveDashboardTemplate(dashboardId, name, description = '') {
  if (!name?.trim()) throw new Error('Template name is required')
  const dashboard = useDashboardStore.getState().dashboards.find((d) => d.id === dashboardId)
  if (!dashboard) throw new Error('Dashboard not found')

  const template = {
    id: genId('dtpl'),
    name: name.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    dashboard: {
      widgets: dashboard.widgets,
      gridCols: dashboard.gridCols,
      rowHeight: dashboard.rowHeight,
    },
  }

  return withTemplatesLock(async () => {
    const data = (await localforage.getItem(TEMPLATES_KEY)) || {}
    data[template.id] = template
    await localforage.setItem(TEMPLATES_KEY, data)
    return template
  })
}

export async function deleteDashboardTemplate(id) {
  return withTemplatesLock(async () => {
    const data = (await localforage.getItem(TEMPLATES_KEY)) || {}
    delete data[id]
    await localforage.setItem(TEMPLATES_KEY, data)
  })
}

// ── Apply ────────────────────────────────────────────────────────────────

/**
 * Creates a NEW dashboard from a template, with fresh ids throughout.
 * Rehydrates any CSV-backed widget bindings from the template's embedded
 * snapshot when the original source doesn't resolve locally. Returns
 * { dashboardId, rehydratedCount }.
 */
export async function applyDashboardTemplate(template) {
  const { dashboard, dataSnapshot } = template
  if (!dashboard?.widgets) throw new Error('Template has no dashboard data')

  const bindings = dashboard.widgets.map((w) => w.binding)
  const { bindings: resolvedBindings, rehydratedCount } = await resolveBindingsAgainstSnapshot(
    bindings, dataSnapshot, { listAllSources }
  )

  const store = useDashboardStore.getState()
  const dashboardId = store.createDashboard({ name: template.name })
  store.updateDashboard(dashboardId, { gridCols: dashboard.gridCols, rowHeight: dashboard.rowHeight })
  dashboard.widgets.forEach((w, i) => {
    store.addWidget(dashboardId, {
      type: w.type,
      title: w.title,
      layout: w.layout,
      binding: resolvedBindings[i],
      config: w.config,
    })
  })

  return { dashboardId, rehydratedCount }
}

// ── Share: export / import as JSON files ──────────────────────────────────

export async function exportDashboardTemplate(template) {
  const bindings = template.dashboard.widgets.map((w) => w.binding)
  const dataSnapshot = await buildDataSnapshot(bindings)

  const payload = {
    kind: FILE_KIND,
    version: 1,
    template: { ...template, dataSnapshot },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${template.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'dashboard'}.dashboard.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Imports a shared dashboard file directly onto the canvas (not into the
 * saved-templates list) — the point of importing a dashboard is to start
 * using it, not to file it away. Every widget id is regenerated so
 * importing the same file twice never collides. Returns
 * { dashboardId, rehydratedCount }.
 */
export async function importDashboardTemplateFromFile(file) {
  const text = await file.text()
  const payload = JSON.parse(text)
  if (payload.kind !== FILE_KIND || !payload.template?.dashboard?.widgets) {
    throw new Error('Not a dashboard file')
  }
  return applyDashboardTemplate(payload.template)
}
