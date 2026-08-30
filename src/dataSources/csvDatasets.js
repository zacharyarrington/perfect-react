// csvDatasets — CRUD + parsing for user-imported CSV files.
//
// Storage: one localforage blob (`appshell_csv_datasets`), keyed by dataset
// id — the same shape as every other feature store in this app
// (userManager.js, layoutTemplates.js, dashboardStorage.js). Every mutator
// that does read-entire-blob -> modify -> write-entire-blob is wrapped in
// withDatasetsLock, mirroring userManager.js's withUsersLock exactly:
// importing two files back to back (or deleting one while another import is
// in flight) would otherwise let the second write silently undo the first —
// the identical race class that caused real data loss there before it had
// this guard.
//
// Subscription: csvProvider.js and any open config form need to notice when
// a dataset is imported/renamed/deleted so their source dropdowns don't go
// stale. onDatasetsChanged(cb) is a tiny pub/sub for that — simpler than
// routing datasets through a zustand store, and keeps this module
// self-contained.

import localforage from 'localforage'
import Papa from 'papaparse'
import { inferFields } from './inferFields'

const DATASETS_KEY = 'appshell_csv_datasets'
const MAX_FILE_SIZE_MB = 10

let datasetsLock = Promise.resolve()
function withDatasetsLock(fn) {
  const result = datasetsLock.then(fn)
  datasetsLock = result.catch(() => {})
  return result
}

const genId = () => `ds_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// ── Change notification ───────────────────────────────────────────────────

const listeners = new Set()
export function onDatasetsChanged(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function notifyChanged() {
  for (const cb of listeners) cb()
}

// ── CRUD ─────────────────────────────────────────────────────────────────

export async function listCsvDatasets() {
  const data = (await localforage.getItem(DATASETS_KEY)) || {}
  return Object.values(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function getCsvDataset(id) {
  const data = (await localforage.getItem(DATASETS_KEY)) || {}
  return data[id] || null
}

/**
 * Parses a File (or Blob) as CSV and stores it as a new dataset.
 * Rejects files over MAX_FILE_SIZE_MB rather than risking the IndexedDB
 * quota on something a browser-side widget shouldn't be rendering anyway.
 */
export async function importCsvFile(file, { name } = {}) {
  const sizeMb = file.size / (1024 * 1024)
  if (sizeMb > MAX_FILE_SIZE_MB) {
    throw new Error(`"${file.name}" is ${sizeMb.toFixed(1)}MB — the limit is ${MAX_FILE_SIZE_MB}MB`)
  }

  const { rows, skipped } = await new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: 'greedy',
      worker: true,
      complete: (results) => {
        if (results.data.length === 0 && results.errors.length > 0) {
          reject(new Error(results.errors[0].message || 'Could not parse this file as CSV'))
          return
        }
        resolve({ rows: results.data, skipped: results.errors.length })
      },
      error: (err) => reject(err),
    })
  })

  if (rows.length === 0) throw new Error('No rows found in this file')

  const dataset = {
    id: genId(),
    name: (name || file.name.replace(/\.csv$/i, '')).trim() || 'Untitled dataset',
    sourceFilename: file.name,
    fields: inferFields(rows),
    rows,
    rowCount: rows.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return withDatasetsLock(async () => {
    const data = (await localforage.getItem(DATASETS_KEY)) || {}
    data[dataset.id] = dataset
    await localforage.setItem(DATASETS_KEY, data)
    notifyChanged()
    return { dataset, skipped }
  })
}

export async function renameCsvDataset(id, name) {
  if (!name?.trim()) throw new Error('Name is required')
  return withDatasetsLock(async () => {
    const data = (await localforage.getItem(DATASETS_KEY)) || {}
    if (!data[id]) throw new Error('Dataset not found')
    data[id] = { ...data[id], name: name.trim(), updatedAt: new Date().toISOString() }
    await localforage.setItem(DATASETS_KEY, data)
    notifyChanged()
    return data[id]
  })
}

export async function deleteCsvDataset(id) {
  return withDatasetsLock(async () => {
    const data = (await localforage.getItem(DATASETS_KEY)) || {}
    delete data[id]
    await localforage.setItem(DATASETS_KEY, data)
    notifyChanged()
  })
}
