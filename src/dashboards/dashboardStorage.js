// dashboardStorage — localforage persistence for the whole dashboard set.
//
// Debounced auto-save on every store change (drag/resize can fire dozens of
// writes per second — see usePersistence.js for the identical pattern used
// for panels), plus a `pagehide` flush so a drag right before closing the
// tab is never lost.
//
// Every mutator that does read-entire-blob -> modify -> write-entire-blob is
// wrapped in withDashboardsLock, mirroring src/auth/userManager.js's
// withUsersLock exactly: two concurrent writes (e.g. importing a dashboard
// while another save is debounced) would otherwise both read the same
// snapshot and the second write would silently undo the first.

import localforage from 'localforage'
import useDashboardStore from './useDashboardStore'

const DASHBOARDS_KEY = 'appshell_dashboards'
const SAVE_DEBOUNCE_MS = 1500

let dashboardsLock = Promise.resolve()
export function withDashboardsLock(fn) {
  const result = dashboardsLock.then(fn)
  dashboardsLock = result.catch(() => {})
  return result
}

/** Direct read of the persisted dashboard list, bypassing the store. */
export async function readDashboards() {
  return (await localforage.getItem(DASHBOARDS_KEY)) || null
}

/** Direct write, guarded by the lock — used by anything mutating storage outside the store's own debounce (e.g. import). */
export async function writeDashboards(dashboards) {
  return withDashboardsLock(async () => {
    await localforage.setItem(DASHBOARDS_KEY, dashboards)
  })
}

let saveTimer = null
function saveNow() {
  const { dashboards } = useDashboardStore.getState()
  return writeDashboards(dashboards)
}

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saveNow().catch(() => {}) }, SAVE_DEBOUNCE_MS)
}

/** Loads dashboards from storage (or seeds a default one) and wires up auto-save. Call once near the app root. */
export async function initDashboardStorage() {
  const store = useDashboardStore.getState()
  const saved = await readDashboards()

  if (saved && saved.length > 0) {
    store.setDashboards(saved)
    store.setActiveDashboard(saved[0].id)
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

  const flush = () => { clearTimeout(saveTimer); saveNow().catch(() => {}) }
  window.addEventListener('pagehide', flush)
}
