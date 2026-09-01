// userManager — local user storage using localforage (IndexedDB).
//
// This is a lightweight, client-side stand-in for a real auth backend: users,
// roles, and the active session all live in the browser. It is ideal for
// internal tools and prototypes. To wire up a real provider later (Clerk,
// Supabase, your own API), keep this module's function signatures and swap
// the implementations — the rest of the app only talks to useAuth/userManager.
//
// preferences/layout writes mirror synchronously to localStorage, same
// pattern as dashboardStorage.js/usePersistence.js: localforage (IndexedDB)
// writes are async, so a pagehide/reload inside that window can silently
// drop the change (reproduced there — see PREFS_SYNC_KEY usage below and
// that file's comment for the full writeup). getActiveUser() prefers
// whichever of the mirror vs. the localforage copy is actually newer.

import localforage from 'localforage'
import APP_CONFIG from '../config/app.config'
import useRolesStore from '../config/rolesStore'

const USERS_KEY       = 'appshell_users'
const ACTIVE_USER_KEY = 'appshell_active_user'
const PROMPTED_KEY    = 'appshell_login_prompted'
const PREFS_SYNC_KEY  = 'appshell_user_prefs_sync' // per-user localStorage durability mirror

export const AVATAR_COLORS = [
  '#00d4c8', '#0099ff', '#7c3aed', '#f59e0b',
  '#ef4444', '#22c55e', '#ec4899', '#f97316',
]

// ── Concurrency guard ────────────────────────────────────────────────────────
// Every mutator below does read-entire-blob -> modify -> write-entire-blob.
// Two mutators racing (e.g. Promise.all over a bulk delete) would otherwise
// both read the same snapshot and the second write would silently undo the
// first. withUsersLock serializes access by chaining onto the previous call's
// promise, so each mutator's read always sees the prior mutator's write.
let usersLock = Promise.resolve()
function withUsersLock(fn) {
  const result = usersLock.then(fn)
  // Swallow errors for chaining purposes only — callers still get the
  // rejection via `result`, which is what's actually returned/awaited.
  usersLock = result.catch(() => {})
  return result
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function listUsers() {
  const data = await localforage.getItem(USERS_KEY) || {}
  return Object.values(data).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export async function createUser({ username, color, role }) {
  if (!username?.trim()) throw new Error('Username is required')
  return withUsersLock(async () => {
    const data = await localforage.getItem(USERS_KEY) || {}
    const existing = Object.values(data)
    if (existing.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      throw new Error('That username is already taken')
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const user = {
      id,
      username: username.trim(),
      color: color || AVATAR_COLORS[0],
      // The very first user becomes admin so someone can manage the rest.
      role: existing.length === 0 ? 'admin' : (role || APP_CONFIG.defaultRole),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: { theme: null, sidebarCollapsed: null },
      layout: null,   // panel layout snapshot
    }
    data[id] = user
    await localforage.setItem(USERS_KEY, data)
    return user
  })
}

export async function updateUser(id, updates) {
  return withUsersLock(async () => {
    const data = await localforage.getItem(USERS_KEY) || {}
    if (!data[id]) throw new Error('User not found')
    if (updates.role && !useRolesStore.getState().roles[updates.role]) throw new Error(`Unknown role "${updates.role}"`)
    data[id] = { ...data[id], ...updates, updatedAt: new Date().toISOString() }
    await localforage.setItem(USERS_KEY, data)
    return data[id]
  })
}

export async function deleteUser(id) {
  return withUsersLock(async () => {
    const data = await localforage.getItem(USERS_KEY) || {}
    delete data[id]
    await localforage.setItem(USERS_KEY, data)
    if (getActiveUserId() === id) clearActiveUserId()
  })
}

// ── Preferences & layout ─────────────────────────────────────────────────────

/** Synchronous mirror write — best-effort, never throws (private mode / quota can reject it). */
function mirrorPrefsToLocalStorageSync(id, preferences, layout, savedAt) {
  try {
    localStorage.setItem(`${PREFS_SYNC_KEY}_${id}`, JSON.stringify({ preferences, layout, savedAt }))
  } catch {
    // best-effort only; localforage remains the source of truth when this fails
  }
}

export async function saveUserPreferences(id, preferences) {
  const savedAt = Date.now()
  return withUsersLock(async () => {
    const data = await localforage.getItem(USERS_KEY) || {}
    if (!data[id]) return
    const merged = { ...(data[id].preferences || {}), ...preferences }
    data[id] = { ...data[id], preferences: merged, updatedAt: new Date(savedAt).toISOString() }
    mirrorPrefsToLocalStorageSync(id, merged, data[id].layout, savedAt)
    await localforage.setItem(USERS_KEY, data)
    return data[id]
  })
}

export async function saveUserLayout(id, panels) {
  const savedAt = Date.now()
  return withUsersLock(async () => {
    const data = await localforage.getItem(USERS_KEY) || {}
    if (!data[id]) return
    const layout = { panels }
    data[id] = { ...data[id], layout, updatedAt: new Date(savedAt).toISOString() }
    mirrorPrefsToLocalStorageSync(id, data[id].preferences, layout, savedAt)
    await localforage.setItem(USERS_KEY, data)
    return data[id]
  })
}

// ── Active user (localStorage for sync access) ───────────────────────────────

export function getActiveUserId() {
  return localStorage.getItem(ACTIVE_USER_KEY) || null
}

export function setActiveUserId(id) {
  if (id) localStorage.setItem(ACTIVE_USER_KEY, id)
  else localStorage.removeItem(ACTIVE_USER_KEY)
}

export function clearActiveUserId() {
  localStorage.removeItem(ACTIVE_USER_KEY)
}

export async function getActiveUser() {
  const id = getActiveUserId()
  if (!id) return null
  const data = await localforage.getItem(USERS_KEY) || {}
  const user = data[id] || null
  if (!user) return null

  // The localStorage mirror can be ahead of the localforage copy if a
  // previous tab closed/reloaded before its debounced preferences/layout
  // write landed — prefer the mirror when it's actually newer, not just
  // present (a stale-but-non-empty mirror from an older session must still
  // lose to what's actually in localforage).
  let mirror = null
  try {
    const raw = localStorage.getItem(`${PREFS_SYNC_KEY}_${id}`)
    if (raw) mirror = JSON.parse(raw)
  } catch {
    // corrupt/unavailable mirror — fall back to the localforage copy
  }

  const storedAt = user.updatedAt ? new Date(user.updatedAt).getTime() : 0
  if (mirror && (mirror.savedAt || 0) > storedAt) {
    return { ...user, preferences: mirror.preferences ?? user.preferences, layout: mirror.layout ?? user.layout }
  }
  return user
}

// ── First-visit tracking ─────────────────────────────────────────────────────

/** True if the login prompt has never been shown on this device. */
export function isFirstLoginPrompt() {
  return !localStorage.getItem(PROMPTED_KEY)
}

export function markLoginPrompted() {
  localStorage.setItem(PROMPTED_KEY, '1')
}
