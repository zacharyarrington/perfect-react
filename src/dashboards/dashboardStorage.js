// dashboardStorage — localforage persistence for the whole dashboard set.
//
// Debounced auto-save on every store change (drag/resize can fire dozens of
// writes per second — see usePersistence.js for the identical pattern used
// for panels).
//
// Every mutator that does read-entire-blob -> modify -> write-entire-blob is
// wrapped in withDashboardsLock, mirroring src/auth/userManager.js's
// withUsersLock exactly: two concurrent writes (e.g. importing a dashboard
// while another save is debounced) would otherwise both read the same
// snapshot and the second write would silently undo the first.
//
// localforage's writes are IndexedDB and therefore async. A `pagehide`
// listener alone isn't enough to guarantee the last save lands: the browser
// doesn't promise that async work kicked off in a pagehide handler gets to
// finish before the document is torn down, so a reload within the debounce
// window (or right on the heels of a change, before the debounced write
// fires) could silently drop it (reproduced: 100% loss reloading <1.5s
// after adding a widget, with IndexedDB confirmed never receiving the
// write). So every debounced/flushed save also mirrors to localStorage —
// a synchronous write that reliably completes even mid-unload — and
// initDashboardStorage() prefers whichever copy is newer on load.

import localforage from 'localforage'
import useDashboardStore from './useDashboardStore'
import useAppStore from '../store/useAppStore'

const DASHBOARDS_KEY = 'appshell_dashboards'
const DASHBOARDS_SYNC_KEY = 'appshell_dashboards_sync' // localStorage durability mirror
const SAVE_DEBOUNCE_MS = 1500

let dashboardsLock = Promise.resolve()
export function withDashboardsLock(fn) {
  const result = dashboardsLock.then(fn)
  dashboardsLock = result.catch(() => {})
  return result
}

/** Synchronous mirror write — best-effort, never throws (private mode / quota can reject it). */
function mirrorToLocalStorageSync(dashboards, savedAt) {
  try {
    localStorage.setItem(DASHBOARDS_SYNC_KEY, JSON.stringify({ dashboards, savedAt }))
  } catch {
    // best-effort only; localforage remains the source of truth when this fails
  }
}

/**
 * Direct read of the persisted dashboard list, bypassing the store.
 * Returns { dashboards, savedAt } so callers can compare freshness against
 * the localStorage mirror — a non-empty-but-stale saved copy (e.g. an older
 * dashboard with fewer/no widgets) must lose to a newer mirror, not just an
 * empty one, so presence alone isn't a safe freshness check.
 */
export async function readDashboards() {
  const raw = await localforage.getItem(DASHBOARDS_KEY)
  // Older saves (pre-envelope) were the bare array; treat those as
  // infinitely stale (savedAt: 0) so a real timestamped mirror always wins.
  if (Array.isArray(raw)) return { dashboards: raw, savedAt: 0 }
  return raw || { dashboards: null, savedAt: 0 }
}

/** Direct write, guarded by the lock — used by anything mutating storage outside the store's own debounce (e.g. import). */
export async function writeDashboards(dashboards, savedAt = Date.now()) {
  mirrorToLocalStorageSync(dashboards, savedAt)
  return withDashboardsLock(async () => {
    await localforage.setItem(DASHBOARDS_KEY, { dashboards, savedAt })
  })
}

let saveTimer = null
function saveNow(savedAt) {
  const { dashboards } = useDashboardStore.getState()
  return writeDashboards(dashboards, savedAt)
}

function reportedSave(savedAt) {
  return saveNow(savedAt)
    .then(() => useAppStore.getState().reportSaved())
    .catch(() => useAppStore.getState().reportSaveError())
}

function scheduleSave() {
  // Mirror synchronously right away, stamped with the moment of the change
  // (not of the eventual write) — cheap, and it's the copy that survives an
  // unload before the debounce timer (or its async IndexedDB write) gets to
  // run. The debounced call below writes the same stamp to localforage.
  const savedAt = Date.now()
  mirrorToLocalStorageSync(useDashboardStore.getState().dashboards, savedAt)
  useAppStore.getState().reportSaving()
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { reportedSave(savedAt) }, SAVE_DEBOUNCE_MS)
}

/** Loads dashboards from storage (or seeds a default one) and wires up auto-save. Call once near the app root. */
export async function initDashboardStorage() {
  const store = useDashboardStore.getState()
  const saved = await readDashboards()

  // The localStorage mirror can be newer than the IndexedDB copy if the tab
  // closed/reloaded before the debounced localforage write landed. Compare
  // by timestamp, not by presence/emptiness — a stale-but-non-empty saved
  // copy (e.g. an earlier dashboard with fewer widgets) must still lose to
  // a newer mirror.
  let syncMirror = null
  try {
    const raw = localStorage.getItem(DASHBOARDS_SYNC_KEY)
    if (raw) syncMirror = JSON.parse(raw)
  } catch {
    // corrupt/unavailable mirror — fall back to the localforage copy below
  }

  const useMirror = syncMirror?.dashboards?.length > 0 && (syncMirror.savedAt || 0) > (saved.savedAt || 0)
  const resolved = useMirror ? syncMirror.dashboards : saved.dashboards

  if (resolved && resolved.length > 0) {
    store.setDashboards(resolved)
    store.setActiveDashboard(resolved[0].id)
    // The mirror was ahead of localforage — persist it for real so the two
    // stay in sync and the next load doesn't need to fall back again.
    if (useMirror) await writeDashboards(resolved, syncMirror.savedAt)
  } else {
    // Subscribing happens below, after this seed write — so on a genuinely
    // fresh install (the only time this branch runs) nothing is listening
    // yet and the seeded dashboard would otherwise never be persisted. Save
    // it immediately rather than relying on the subscription to catch it.
    const id = store.createDashboard({ name: 'Overview' })
    store.setActiveDashboard(id)
    await saveNow()
  }
  store.setLoaded(true)

  useDashboardStore.subscribe((s) => s.dashboards, scheduleSave)

  const flush = () => { clearTimeout(saveTimer); reportedSave() }
  window.addEventListener('pagehide', flush)
  // visibilitychange fires when a tab is backgrounded/closed and — unlike
  // pagehide — well before any document teardown, so async work it starts
  // reliably gets to finish. Cheap to also flush here since scheduleSave's
  // synchronous mirror already covers the same moment; this just gives the
  // real localforage write another, more reliable chance to run.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}
