// userManager.example.api — a commented-out reference implementation showing
// the swap-in point for a real backend. This file is NOT imported anywhere —
// copy it, rename it to userManager.js (replacing the local one), fill in
// your endpoints, and nothing else changes: useAuth.js, LoginDialog.jsx,
// UsersPage.jsx, and every other consumer only ever call these exported
// functions by name — none of them touch localforage/localStorage directly.
// That's the entire integration surface for user management.
//
// (Roles/permissions are a separate concern with their own swap-in point —
// see rolesStore.example.api.js. userManager only needs `roles` to validate
// a role id in updateUser(); it doesn't own role definitions.)
//
// ── Two different things live in the local version today — split them ──────
//
// 1. THE USER DIRECTORY (listUsers/createUser/updateUser/deleteUser,
//    saveUserPreferences/saveUserLayout, getActiveUser's data lookup): a CRUD
//    resource. This is the part that becomes real REST/GraphQL calls below.
//
// 2. THE SESSION (getActiveUserId/setActiveUserId/clearActiveUserId): right
//    now just a plain localStorage token with zero verification — anyone
//    with devtools can set it to any user id and BE that user, client-side
//    permission checks and all. That's fine for a local prototype; it is
//    not fine once createUser/deleteUser hit a real API. A real backend
//    MUST verify the caller's identity server-side on every request (a
//    session cookie or a Bearer token your auth provider issued) — never
//    trust a user id the client hands you. getActiveUserId() below should
//    become "do we have a valid session token" and getActiveUser() should
//    ask the server who that token belongs to, not read a client-editable id.
//
// ── Call timing (unchanged from the local version — nothing else to learn) ──
//   - listUsers(): UsersPage mount + after every mutation (its `refresh()`)
//   - createUser(): LoginDialog's "Create User" and UsersPage's "Add User"
//   - updateUser(): UsersPage's role-change dropdown
//   - deleteUser(): UsersPage's delete button/bulk-delete
//   - getActiveUser(): usePersistence.js on every app load, to restore session
//   - saveUserPreferences/saveUserLayout(): usePersistence.js, debounced,
//     on every theme/sidebar/panel-layout change while signed in
//
// Every one of these currently resolves near-instantly from IndexedDB. Once
// they're real network calls, the UI needs to handle latency and failure it
// doesn't today — none of the call sites currently show a loading spinner
// while `createUser`/`listUsers` are in flight, and errors from a rejected
// promise mostly surface as a toast (see UsersPage/LoginDialog's try/catch
// around form submission) rather than anything more specific. Test slow/
// failed responses once this is wired up, not just the happy path.

// const API_BASE = import.meta.env.VITE_API_BASE_URL
//
// async function authedFetch(path, options) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     ...options,
//     headers: {
//       'Content-Type': 'application/json',
//       ...options?.headers,
//       Authorization: `Bearer ${getAuthToken()}`,   // wherever your session token lives
//     },
//   })
//   if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
//   if (res.status === 204) return null
//   return res.json()
// }
//
// export const AVATAR_COLORS = [
//   '#00d4c8', '#0099ff', '#7c3aed', '#f59e0b',
//   '#ef4444', '#22c55e', '#ec4899', '#f97316',
// ]
//
// // ── CRUD ────────────────────────────────────────────────────────────────────
//
// export async function listUsers() {
//   // -> [{ id, username, color, role, createdAt, updatedAt, preferences, layout }]
//   return authedFetch('/api/users')
// }
//
// export async function createUser({ username, color, role }) {
//   // Let the server decide "first user becomes admin" — the client
//   // shouldn't be trusted to self-assign a role, including the local
//   // version's own "first user" special case.
//   return authedFetch('/api/users', {
//     method: 'POST',
//     body: JSON.stringify({ username, color, role }),
//   })
// }
//
// export async function updateUser(id, updates) {
//   // Server should re-validate `updates.role` against real role ids and
//   // reject a demote-the-last-admin request server-side too — UsersPage's
//   // client-side check is a UX nicety, not a security boundary.
//   return authedFetch(`/api/users/${id}`, {
//     method: 'PATCH',
//     body: JSON.stringify(updates),
//   })
// }
//
// export async function deleteUser(id) {
//   await authedFetch(`/api/users/${id}`, { method: 'DELETE' })
//   if (getActiveUserId() === id) clearActiveUserId()
// }
//
// // ── Preferences & layout ─────────────────────────────────────────────────────
// // These fire on every debounced auto-save (see usePersistence.js) — expect
// // frequent small PATCHes while a user drags/resizes panels. Consider a
// // dedicated lightweight endpoint rather than routing through the full user
// // PATCH above, and keep it idempotent (last-write-wins is fine here, same
// // as the local version).
//
// export async function saveUserPreferences(id, preferences) {
//   return authedFetch(`/api/users/${id}/preferences`, {
//     method: 'PATCH',
//     body: JSON.stringify(preferences),
//   })
// }
//
// export async function saveUserLayout(id, panels) {
//   return authedFetch(`/api/users/${id}/layout`, {
//     method: 'PATCH',
//     body: JSON.stringify({ panels }),
//   })
// }
//
// // ── Session ───────────────────────────────────────────────────────────────
// // Replace with whatever your auth provider actually issues — a cookie your
// // API sets and reads automatically (nothing to do here), or a token you
// // store yourself. Sketched below as a token in localStorage for parity with
// // the local version's shape, but treat this as the part to replace with
// // your real auth flow (Clerk/Supabase/your own), not something to hand-roll.
//
// const SESSION_TOKEN_KEY = 'appshell_session_token'
//
// export function getActiveUserId() {
//   return localStorage.getItem(SESSION_TOKEN_KEY) || null   // really: "do we have a session"
// }
// export function setActiveUserId(token) {
//   if (token) localStorage.setItem(SESSION_TOKEN_KEY, token)
//   else localStorage.removeItem(SESSION_TOKEN_KEY)
// }
// export function clearActiveUserId() {
//   localStorage.removeItem(SESSION_TOKEN_KEY)
// }
//
// export async function getActiveUser() {
//   if (!getActiveUserId()) return null
//   // Ask the server who the current session belongs to — never trust a
//   // client-held user id for this. Return null (not throw) on 401 so
//   // usePersistence.js's restore flow falls through to "no active user"
//   // cleanly instead of crashing app boot.
//   try {
//     return await authedFetch('/api/me')
//   } catch {
//     return null
//   }
// }
//
// // ── First-visit tracking ─────────────────────────────────────────────────────
// // Purely local UX state (has this browser seen the login prompt before) —
// // no reason to move this server-side even with a real backend.
//
// const PROMPTED_KEY = 'appshell_login_prompted'
// export function isFirstLoginPrompt() {
//   return !localStorage.getItem(PROMPTED_KEY)
// }
// export function markLoginPrompted() {
//   localStorage.setItem(PROMPTED_KEY, '1')
// }

export {}
