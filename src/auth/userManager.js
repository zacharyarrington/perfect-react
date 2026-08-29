// userManager — local user storage using localforage (IndexedDB).
//
// This is a lightweight, client-side stand-in for a real auth backend: users,
// roles, and the active session all live in the browser. It is ideal for
// internal tools and prototypes. To wire up a real provider later (Clerk,
// Supabase, your own API), keep this module's function signatures and swap
// the implementations — the rest of the app only talks to useAuth/userManager.

import localforage from 'localforage'
import APP_CONFIG from '../config/app.config'
import { ROLES } from '../config/roles.config'

const USERS_KEY       = 'appshell_users'
const ACTIVE_USER_KEY = 'appshell_active_user'
const PROMPTED_KEY    = 'appshell_login_prompted'

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
    if (updates.role && !ROLES[updates.role]) throw new Error(`Unknown role "${updates.role}"`)
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

export async function saveUserPreferences(id, preferences) {
  return withUsersLock(async () => {
    const data = await localforage.getItem(USERS_KEY) || {}
    if (!data[id]) return
    data[id] = {
      ...data[id],
      preferences: { ...(data[id].preferences || {}), ...preferences },
      updatedAt: new Date().toISOString(),
    }
    await localforage.setItem(USERS_KEY, data)
    return data[id]
  })
}

export async function saveUserLayout(id, panels) {
  return withUsersLock(async () => {
    const data = await localforage.getItem(USERS_KEY) || {}
    if (!data[id]) return
    data[id] = { ...data[id], layout: { panels }, updatedAt: new Date().toISOString() }
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
  return data[id] || null
}

// ── First-visit tracking ─────────────────────────────────────────────────────

/** True if the login prompt has never been shown on this device. */
export function isFirstLoginPrompt() {
  return !localStorage.getItem(PROMPTED_KEY)
}

export function markLoginPrompted() {
  localStorage.setItem(PROMPTED_KEY, '1')
}
