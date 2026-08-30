// widgetTemplates — save/export/import a single widget's configuration as a
// reusable template, mirroring src/layouts/layoutTemplates.js's shape (see
// src/dashboards/dashboardTemplates.js for the fuller rationale, which this
// mirrors at the widget scale instead of the whole-dashboard scale).
//
// A saved widget template stores `defaultLayout`, not `layout` — a template
// has no position on any canvas until it's actually dropped onto one, so it
// reuses the widget type's own default geometry at instantiation time
// (instantiateWidgetTemplate), same as picking a fresh built-in type from
// the picker would.
//
// Every mutator is wrapped in withTemplatesLock (the identical
// withUsersLock/withDashboardsLock pattern used elsewhere), and export
// embeds a capped CSV-only data snapshot exactly like dashboardTemplates.js
// so a shared widget isn't blank on arrival.

import localforage from 'localforage'
import { WIDGET_TYPES_BY_ID } from './widgets.config'
import { buildDataSnapshot, resolveBindingsAgainstSnapshot } from '../dataSources/dataSnapshot'
import { listAllSources } from '../dataSources/registry'

const TEMPLATES_KEY = 'appshell_widget_templates'
const FILE_KIND = 'appshell-widget'

let templatesLock = Promise.resolve()
function withTemplatesLock(fn) {
  const result = templatesLock.then(fn)
  templatesLock = result.catch(() => {})
  return result
}

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// ── CRUD ─────────────────────────────────────────────────────────────────

export async function listWidgetTemplates() {
  const data = (await localforage.getItem(TEMPLATES_KEY)) || {}
  return Object.values(data).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

/** Saves a configured widget instance (by value) as a reusable template. */
export async function saveWidgetTemplate(instance, name, description = '') {
  if (!name?.trim()) throw new Error('Template name is required')
  const type = WIDGET_TYPES_BY_ID[instance.type]
  if (!type) throw new Error(`Unknown widget type "${instance.type}"`)

  const template = {
    id: genId('wtpl'),
    name: name.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    widget: {
      type: instance.type,
      title: instance.title,
      config: instance.config,
      binding: instance.binding,
    },
  }

  return withTemplatesLock(async () => {
    const data = (await localforage.getItem(TEMPLATES_KEY)) || {}
    data[template.id] = template
    await localforage.setItem(TEMPLATES_KEY, data)
    return template
  })
}

export async function deleteWidgetTemplate(id) {
  return withTemplatesLock(async () => {
    const data = (await localforage.getItem(TEMPLATES_KEY)) || {}
    delete data[id]
    await localforage.setItem(TEMPLATES_KEY, data)
  })
}

// ── Instantiate ────────────────────────────────────────────────────────────

/**
 * Turns a saved/imported template into fresh widgetData ready for
 * useDashboardStore's addWidget(dashboardId, widgetData) — no id, no
 * position (addWidget's own auto-placement handles that, same as adding a
 * built-in type from the picker). Rehydrates the binding from the
 * template's embedded snapshot when its source doesn't resolve locally.
 * Returns { widgetData, rehydratedCount }.
 */
export async function instantiateWidgetTemplate(template) {
  const { widget, dataSnapshot } = template
  const { bindings: [binding], rehydratedCount } = await resolveBindingsAgainstSnapshot(
    [widget.binding], dataSnapshot, { listAllSources }
  )
  return {
    widgetData: { type: widget.type, title: widget.title, config: widget.config, binding },
    rehydratedCount,
  }
}

// ── Share: export / import as JSON files ──────────────────────────────────

export async function exportWidgetTemplate(template) {
  const dataSnapshot = await buildDataSnapshot([template.widget.binding])

  const payload = { kind: FILE_KIND, version: 1, template: { ...template, dataSnapshot } }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${template.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'widget'}.widget.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importWidgetTemplateFromFile(file) {
  const text = await file.text()
  const payload = JSON.parse(text)
  if (payload.kind !== FILE_KIND || !payload.template?.widget) {
    throw new Error('Not a widget file')
  }
  const template = {
    ...payload.template,
    id: genId('wtpl'), // fresh id — never collide
    importedAt: new Date().toISOString(),
  }
  return withTemplatesLock(async () => {
    const data = (await localforage.getItem(TEMPLATES_KEY)) || {}
    data[template.id] = template
    await localforage.setItem(TEMPLATES_KEY, data)
    return template
  })
}
