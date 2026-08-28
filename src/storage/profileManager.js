// profileManager — local profile storage using localforage (IndexedDB)
// Profiles are optional; the app works in guest mode without one.

import localforage from 'localforage'
import { supabase } from '../lib/supabaseClient'

const PROFILES_KEY         = 'readymapgo_profiles'
const ACTIVE_PROFILE_KEY   = 'readymapgo_active_profile'
const PROFILE_PROMPTED_KEY = 'readymapgo_profile_prompted'

export const AVATAR_COLORS = [
  '#00d4c8', '#0099ff', '#7c3aed', '#f59e0b',
  '#ef4444', '#22c55e', '#ec4899', '#f97316',
]

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function listProfiles() {
  const data = await localforage.getItem(PROFILES_KEY) || {}
  return Object.values(data).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export async function createProfile({ username, color }) {
  if (!username?.trim()) throw new Error('Username is required')
  const id = `profile_${Date.now()}`
  const profile = {
    id,
    username: username.trim(),
    color: color || AVATAR_COLORS[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Preferences saved with the profile
    preferences: {
      appTheme: null,   // null = inherit app default
      mapStyle: null,   // null = inherit current
    },
    // Panel layout snapshot
    layout: null,
  }
  const data = await localforage.getItem(PROFILES_KEY) || {}
  data[id] = profile
  await localforage.setItem(PROFILES_KEY, data)
  return profile
}

export async function updateProfile(id, updates) {
  const data = await localforage.getItem(PROFILES_KEY) || {}
  if (!data[id]) throw new Error('Profile not found')
  data[id] = { ...data[id], ...updates, updatedAt: new Date().toISOString() }
  await localforage.setItem(PROFILES_KEY, data)
  return data[id]
}

export async function deleteProfile(id) {
  const data = await localforage.getItem(PROFILES_KEY) || {}
  delete data[id]
  await localforage.setItem(PROFILES_KEY, data)
  if (getActiveProfileId() === id) clearActiveProfileId()

  const { deleteProjectsByProfile } = await import('./projectManager')
  await deleteProjectsByProfile(id)
}

// ── Preference & Layout helpers ───────────────────────────────────────────────

export async function saveProfilePreferences(id, preferences) {
  const data = await localforage.getItem(PROFILES_KEY) || {}
  if (!data[id]) return
  data[id] = {
    ...data[id],
    preferences: { ...(data[id].preferences || {}), ...preferences },
    updatedAt: new Date().toISOString(),
  }
  await localforage.setItem(PROFILES_KEY, data)
  return data[id]
}

export async function saveProfileLayout(id, panels) {
  const data = await localforage.getItem(PROFILES_KEY) || {}
  if (!data[id]) return
  data[id] = {
    ...data[id],
    layout: { panels },
    updatedAt: new Date().toISOString(),
  }
  await localforage.setItem(PROFILES_KEY, data)
  return data[id]
}

// ── Active profile (localStorage for sync access) ─────────────────────────────

export function getActiveProfileId() {
  return localStorage.getItem(ACTIVE_PROFILE_KEY) || null
}

export function setActiveProfileId(id) {
  if (id) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id)
  } else {
    localStorage.removeItem(ACTIVE_PROFILE_KEY)
  }
}

export function clearActiveProfileId() {
  localStorage.removeItem(ACTIVE_PROFILE_KEY)
}

export async function getActiveProfile() {
  const id = getActiveProfileId()
  if (!id) return null
  const data = await localforage.getItem(PROFILES_KEY) || {}
  return data[id] || null
}

// ── Tier sync (Supabase is the source of truth; local profile is the cache) ──

/**
 * Fetches this Clerk user's tier/subscription row from Supabase and caches
 * it onto their local profile. Falls back to 'free' if no row exists yet
 * (e.g. they've never completed checkout) or the request fails.
 */
export async function syncTierFromSupabase(profileId, clerkUserId) {
  if (!clerkUserId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('tier, stripe_status')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  const tier = !error && data ? data.tier : 'free'
  const stripeStatus = !error && data ? data.stripe_status : null

  return updateProfile(profileId, { tier, stripeStatus })
}

// ── First-visit tracking ──────────────────────────────────────────────────────

/** Returns true if the user has never seen the profile prompt before. */
export function isFirstProfilePrompt() {
  return !localStorage.getItem(PROFILE_PROMPTED_KEY)
}

/** Mark that we've shown the profile prompt at least once. */
export function markProfilePrompted() {
  localStorage.setItem(PROFILE_PROMPTED_KEY, '1')
}
