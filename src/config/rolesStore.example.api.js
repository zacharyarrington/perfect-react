// rolesStore.example.api — a commented-out reference implementation showing
// the swap-in point for a real backend. This file is NOT imported anywhere —
// copy it, rename it to rolesStore.js (replacing the local one), fill in your
// endpoints. useAuth.js, userManager.js, LoginDialog.jsx, UserBadge.jsx, and
// RolesEditor.jsx all go through this store's exported hook/functions, never
// localforage directly — that's the entire integration surface.
//
// Keep the same shape: a zustand store exposing `roles` (an object keyed by
// role id — { label, badge, permissions[] }), `loaded`, `load()`,
// `saveRole(id, role)`, `deleteRole(id)`, plus the standalone
// `roleHasPermission(role, permission)` export and the `PERMISSION_CATALOG`
// array (still computed locally from pages.config.jsx/panels.config.jsx —
// that part has nothing to do with your backend and should stay as-is).
//
// DEFAULT_ROLES (from roles.config.js) should stay as the store's initial
// state even with a real API — it's what renders before load() resolves and
// what the app falls back to if the roles endpoint is unreachable, so
// permission checks never see an empty/broken state during a network blip.
//
// Call timing:
//   - load(): once, at App.jsx module scope (before first render) — see the
//     comment there on why it's not inside a useEffect.
//   - saveRole(id, role): RolesEditor's create/edit form submit
//   - deleteRole(id): RolesEditor's delete button
//   - roleHasPermission(role, permission): called synchronously, many times
//     per render, from useAuth.js's hasPermission — this MUST stay a
//     synchronous read against already-fetched state (never an async call
//     itself), or every RequirePermission/page-gate/panel-toggle in the app
//     breaks. Keep roles cached in the store the way the local version does;
//     don't refetch inside this function.

// const API_BASE = import.meta.env.VITE_API_BASE_URL
//
// async function authedFetch(path, options) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     ...options,
//     headers: {
//       'Content-Type': 'application/json',
//       ...options?.headers,
//       Authorization: `Bearer ${getAuthToken()}`,
//     },
//   })
//   if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
//   if (res.status === 204) return null
//   return res.json()
// }
//
// import { create } from 'zustand'
// import { DEFAULT_ROLES, EXTRA_PERMISSIONS } from './roles.config'
// import PAGES from './pages.config'
// import PANELS from './panels.config'
//
// export const PERMISSION_CATALOG = [...new Set([
//   ...PAGES.map((p) => p.permission).filter(Boolean),
//   ...PANELS.map((p) => p.permission).filter(Boolean),
//   ...EXTRA_PERMISSIONS,
// ])].sort()
//
// const useRolesStore = create((set, get) => ({
//   roles: DEFAULT_ROLES,   // real data replaces this once load() resolves — never start empty
//   loaded: false,
//
//   load: async () => {
//     try {
//       // -> { [roleId]: { label, badge, permissions: string[] } }
//       const roles = await authedFetch('/api/roles')
//       set({ roles: { ...DEFAULT_ROLES, ...roles }, loaded: true })
//     } catch {
//       // Unreachable API — keep DEFAULT_ROLES rather than locking everyone
//       // out. Consider surfacing this to the user (a toast) so a stale
//       // permission set isn't silently mistaken for a real server response.
//       set({ loaded: true })
//     }
//   },
//
//   saveRole: async (id, role) => {
//     // Server should own id generation for a brand-new role (don't trust a
//     // client-side slugify the way the local version's RolesEditor does) —
//     // return the real id/role back and key the local cache by that.
//     const saved = await authedFetch(`/api/roles/${id}`, {
//       method: 'PUT',
//       body: JSON.stringify(role),
//     })
//     set((s) => ({ roles: { ...s.roles, [id]: saved } }))
//   },
//
//   deleteRole: async (id) => {
//     // Server should refuse to delete a role that's still assigned to a
//     // user, and refuse to delete 'admin' — RolesEditor's client-side
//     // checks for both are UX niceties, not the enforcement boundary.
//     await authedFetch(`/api/roles/${id}`, { method: 'DELETE' })
//     set((s) => {
//       const roles = { ...s.roles }
//       delete roles[id]
//       return { roles }
//     })
//   },
// }))
//
// export function roleHasPermission(role, permission) {
//   if (!permission) return true
//   const def = useRolesStore.getState().roles[role]
//   if (!def) return false
//   return def.permissions.includes('*') || def.permissions.includes(permission)
// }
//
// export default useRolesStore

export {}
