// dataSnapshot — the shared "embed data behind a live binding" logic used by
// both dashboardTemplates.js and widgetTemplates.js when exporting/importing
// shared files.
//
// Why a hybrid rather than pure binding-only or pure snapshot: a shared
// dashboard/widget that renders nothing on arrival reads as broken, and pure
// binding only works when the recipient has the same backend — which by
// definition they don't yet, since the shipped sources are mock/CSV. Pure
// snapshot goes stale immediately and stops being useful the moment a real
// API provider exists. So export writes both: the live `binding` (tried
// first on import — fresh data, the actual point of a dashboard) and a
// capped snapshot as a fallback, used only when the binding's source can't
// be resolved locally.
//
// Only CSV sources are snapshotted (mock datasets exist on every install —
// no need to embed them; a future `api:` source may carry
// credentials-derived rows that shouldn't be serialized into a shared file).
// Snapshots are capped at MAX_SNAPSHOT_ROWS so a share file can't balloon
// into a multi-megabyte download.

import { parseSourceId, makeSourceId } from './registry'
import { getCsvDataset, importCsvFile } from './csvDatasets'

const MAX_SNAPSHOT_ROWS = 2000

/**
 * Collects a { [sourceId]: {name, fields, rows, truncated} } snapshot for
 * every CSV-backed sourceId referenced by the given bindings. Skips
 * duplicates and non-CSV sources.
 */
export async function buildDataSnapshot(bindings) {
  const snapshot = {}
  const seen = new Set()
  for (const binding of bindings) {
    const sourceId = binding?.sourceId
    if (!sourceId || seen.has(sourceId)) continue
    seen.add(sourceId)

    const parsed = parseSourceId(sourceId)
    if (parsed?.providerId !== 'csv') continue

    const dataset = await getCsvDataset(parsed.datasetId)
    if (!dataset) continue

    snapshot[sourceId] = {
      name: dataset.name,
      fields: dataset.fields,
      rows: dataset.rows.slice(0, MAX_SNAPSHOT_ROWS),
      truncated: dataset.rows.length > MAX_SNAPSHOT_ROWS,
    }
  }
  return snapshot
}

/**
 * Resolves each binding's sourceId against what's actually available
 * locally. If the source resolves as-is, the binding is returned unchanged.
 * If not and a snapshot entry exists for it, the snapshot is silently
 * re-imported as a new local CSV dataset and the binding is rewritten to
 * point at it. Returns { bindings, rehydratedCount } so callers can toast
 * about how many were recovered from the embedded snapshot.
 */
export async function resolveBindingsAgainstSnapshot(bindings, dataSnapshot, { listAllSources }) {
  if (!dataSnapshot || Object.keys(dataSnapshot).length === 0) {
    return { bindings, rehydratedCount: 0 }
  }

  const localSources = await listAllSources()
  const localSourceIds = new Set(localSources.map((s) => s.sourceId))
  const rehydratedFor = new Map() // original sourceId -> new local sourceId

  let rehydratedCount = 0
  const resolved = []
  for (const binding of bindings) {
    const sourceId = binding?.sourceId
    if (!sourceId || localSourceIds.has(sourceId) || !dataSnapshot[sourceId]) {
      resolved.push(binding)
      continue
    }

    if (rehydratedFor.has(sourceId)) {
      resolved.push({ ...binding, sourceId: rehydratedFor.get(sourceId) })
      continue
    }

    const snap = dataSnapshot[sourceId]
    try {
      // Re-import via the same CSV pipeline everything else uses, so the
      // rehydrated dataset is indistinguishable from one a user imported by
      // hand — same storage, same lock, same shape.
      const csvLikeFile = new File(
        [rowsToCsv(snap.fields, snap.rows)],
        `${snap.name}.csv`,
        { type: 'text/csv' }
      )
      const { dataset } = await importCsvFile(csvLikeFile, { name: `${snap.name} (imported)` })
      const newSourceId = makeSourceId('csv', dataset.id)
      rehydratedFor.set(sourceId, newSourceId)
      rehydratedCount++
      resolved.push({ ...binding, sourceId: newSourceId })
    } catch {
      // Rehydration failed (e.g. quota) — leave the binding pointing at the
      // unresolvable sourceId; the widget's own empty/error state handles it.
      resolved.push(binding)
    }
  }

  return { bindings: resolved, rehydratedCount }
}

/** Minimal CSV serializer for re-importing a snapshot through the normal CSV pipeline. */
function rowsToCsv(fields, rows) {
  const keys = fields.map((f) => f.key)
  const escape = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [keys.join(',')]
  for (const row of rows) lines.push(keys.map((k) => escape(row[k])).join(','))
  return lines.join('\n')
}
