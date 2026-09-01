// rolesStore — runtime-editable overlay on top of roles.config.js's static
// DEFAULT_ROLES. Persisted to localforage (IndexedDB), same pattern as
// userManager.js's users blob — a single object keyed by role id.
//
// The store's initial state IS the static defaults (not empty), so every
// permission check made before load() resolves still sees the real roles
// instead of a gap where nothing has access to anything. load() then
// overlays whatever was persisted on top: an edited role replaces its
// default entry; a brand-new role is added; a role absent from the saved
// blob (never customized) keeps falling back to its config default via
// mergeWithDefaults.
//
// Every module that used to `import { ROLES, roleHasPermission } from
// './roles.config'` now reads from here instead — useAuth (hook, reactive),
// userManager/LoginDialog (imperative, via useRolesStore.getState()).
//
//   import useRolesStore, { roleHasPermission } from '../config/rolesStore'
//   const roles = useRolesStore((s) => s.roles)              // hook, reactive
//   const roles = useRolesStore.getState().roles              // imperative

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import localforage from 'localforage'
import { DEFAULT_ROLES, EXTRA_PERMISSIONS } from './roles.config'
import PAGES from './pages.config'
import PANELS from './panels.config'

const ROLES_KEY = 'appshell_roles'
const ROLES_SYNC_KEY = 'appshell_roles_sync' // localStorage durability mirror

// Every known permission string, auto-discovered from the page/panel
// registries plus EXTRA_PERMISSIONS (ones only referenced imperatively via
// <RequirePermission> in custom app code, not on a registry entry) — this is
// what the Roles editor's checkbox list is built from, so it never drifts
// out of sync with what the app actually gates. Sorted for a stable UI order.
export const PERMISSION_CATALOG = [...new Set([
  ...PAGES.map((p) => p.permission).filter(Boolean),
  ...PANELS.map((p) => p.permission).filter(Boolean),
  ...EXTRA_PERMISSIONS,
])].sort()

// Every mutator does read-entire-blob -> modify -> write-entire-blob, so
// concurrent mutators need the same serialization used in userManager.js /
// dashboardStorage.js or a race could silently undo one write with another.
let rolesLock = Promise.resolve()
function withRolesLock(fn) {
  const result = rolesLock.then(fn)
  rolesLock = result.catch(() => {})
  return result
}

function mirrorToLocalStorageSync(overrides, savedAt) {
  try {
    localStorage.setItem(ROLES_SYNC_KEY, JSON.stringify({ overrides, savedAt }))
  } catch {
    // best-effort only; localforage remains the source of truth when this fails
  }
}

/** Config defaults with any persisted overrides layered on top, key by key. */
function mergeWithDefaults(overrides) {
  return { ...DEFAULT_ROLES, ...(overrides || {}) }
}

const useRolesStore = create(
  subscribeWithSelector((set, get) => ({
    roles: DEFAULT_ROLES,   // always populated — see file header
    overrides: null,        // raw persisted blob, null until load() resolves
    loaded: false,

    load: async () => {
      const stored = await localforage.getItem(ROLES_KEY)
      let overrides = stored?.overrides ?? null
      let savedAt = stored?.savedAt ?? 0

      // Same freshness check as dashboards/panels/user-prefs: a mirror ahead
      // of the localforage copy (last write interrupted by reload) wins.
      try {
        const raw = localStorage.getItem(ROLES_SYNC_KEY)
        if (raw) {
          const mirror = JSON.parse(raw)
          if ((mirror.savedAt || 0) > savedAt) {
            overrides = mirror.overrides
            savedAt = mirror.savedAt
            await localforage.setItem(ROLES_KEY, { overrides, savedAt })
          }
        }
      } catch {
        // corrupt/unavailable mirror — fall back to the localforage copy
      }

      set({ overrides, roles: mergeWithDefaults(overrides), loaded: true })
    },

    /** Create or update a role. `id` is the role key (e.g. 'editor'). */
    saveRole: (id, role) => withRolesLock(async () => {
      const savedAt = Date.now()
      const overrides = { ...(get().overrides || {}), [id]: role }
      mirrorToLocalStorageSync(overrides, savedAt)
      set({ overrides, roles: mergeWithDefaults(overrides) })
      await localforage.setItem(ROLES_KEY, { overrides, savedAt })
    }),

    /** Deletes a custom override, reverting to the config default if one exists
     *  under the same id, or removing the role entirely if it doesn't. */
    deleteRole: (id) => withRolesLock(async () => {
      const savedAt = Date.now()
      const overrides = { ...(get().overrides || {}) }
      delete overrides[id]
      mirrorToLocalStorageSync(overrides, savedAt)
      // A role that only ever existed as an override (not in DEFAULT_ROLES)
      // must actually disappear once its override is gone, not fall back to
      // a default that was never there — mergeWithDefaults alone can't tell
      // "no override, but has a default" apart from "no override, no default"
      // without this explicit filter.
      const merged = mergeWithDefaults(overrides)
      const roles = id in DEFAULT_ROLES ? merged : Object.fromEntries(Object.entries(merged).filter(([k]) => k !== id))
      set({ overrides, roles })
      await localforage.setItem(ROLES_KEY, { overrides, savedAt })
    }),
  }))
)

/** True when `role` (a key of the current roles map) grants `permission`.
 *  An undefined/null permission means "public" and always passes. */
export function roleHasPermission(role, permission) {
  if (!permission) return true
  const def = useRolesStore.getState().roles[role]
  if (!def) return false
  return def.permissions.includes('*') || def.permissions.includes(permission)
}

export default useRolesStore
