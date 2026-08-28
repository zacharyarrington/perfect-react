import localforage from 'localforage'
import useAppStore from '../store/useAppStore'

const PROJECTS_KEY = 'readymapgo_projects'
const AUTOSAVE_KEY = 'readymapgo_autosave'
const PANEL_STATE_KEY = 'readymapgo_panels'

/** Per-identity autosave key, so each profile (and guest mode) keeps its own last-open session. */
function autoSaveKeyFor(profileId) {
  return profileId ? `${AUTOSAVE_KEY}_${profileId}` : `${AUTOSAVE_KEY}_guest`
}

// Configure localforage
localforage.config({
  name: 'ReadyMapGo',
  storeName: 'projects',
  description: 'ReadyMapGo project storage',
})

// ── Save / Load Projects ──────────────────────────────────────────────────

export async function saveProject(name) {
  const snapshot = useAppStore.getState().serialize()
  snapshot.project = { ...snapshot.project, name, modifiedAt: new Date().toISOString() }
  snapshot.profileId = useAppStore.getState().activeProfile?.id || null

  const existing = (await localforage.getItem(PROJECTS_KEY)) || {}
  const id = Object.keys(existing).find((k) => existing[k].project.name === name) || `proj_${Date.now()}`

  existing[id] = snapshot
  await localforage.setItem(PROJECTS_KEY, existing)
  useAppStore.getState().setProjectName(name)
  return id
}

/** Deletes every saved project owned by the given profile, plus their autosaved session. */
export async function deleteProjectsByProfile(profileId) {
  const existing = (await localforage.getItem(PROJECTS_KEY)) || {}
  let changed = false
  for (const id of Object.keys(existing)) {
    if (existing[id].profileId === profileId) {
      delete existing[id]
      changed = true
    }
  }
  if (changed) await localforage.setItem(PROJECTS_KEY, existing)

  await localforage.removeItem(autoSaveKeyFor(profileId))
}

export async function loadProject(id) {
  const existing = (await localforage.getItem(PROJECTS_KEY)) || {}
  const snapshot = existing[id]
  if (!snapshot) throw new Error(`Project ${id} not found`)
  useAppStore.getState().loadFromSnapshot(snapshot)
  return snapshot
}

export async function listProjects() {
  const existing = (await localforage.getItem(PROJECTS_KEY)) || {}
  return Object.entries(existing).map(([id, p]) => ({
    id,
    name: p.project?.name || 'Untitled',
    modifiedAt: p.project?.modifiedAt,
    layerCount: p.layers?.length || 0,
  })).sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
}

export async function deleteProject(id) {
  const existing = (await localforage.getItem(PROJECTS_KEY)) || {}
  delete existing[id]
  await localforage.setItem(PROJECTS_KEY, existing)
}

export async function renameProject(id, name) {
  const existing = (await localforage.getItem(PROJECTS_KEY)) || {}
  if (!existing[id]) throw new Error(`Project ${id} not found`)
  existing[id].project = { ...existing[id].project, name, modifiedAt: new Date().toISOString() }
  await localforage.setItem(PROJECTS_KEY, existing)
}

export async function duplicateProject(id) {
  const existing = (await localforage.getItem(PROJECTS_KEY)) || {}
  const original = existing[id]
  if (!original) throw new Error(`Project ${id} not found`)
  const newId = `proj_${Date.now()}`
  existing[newId] = {
    ...original,
    project: {
      ...original.project,
      name: `${original.project.name} (copy)`,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    },
  }
  await localforage.setItem(PROJECTS_KEY, existing)
  return newId
}

export function exportProjectToFile(snapshot, name) {
  const json = JSON.stringify(snapshot, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/[^a-z0-9_-]/gi, '_') || 'project'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportProjectById(id) {
  const existing = (await localforage.getItem(PROJECTS_KEY)) || {}
  const snapshot = existing[id]
  if (!snapshot) throw new Error(`Project ${id} not found`)
  exportProjectToFile(snapshot, snapshot.project?.name || 'project')
}

export function importProjectFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const snapshot = JSON.parse(e.target.result)
        if (!snapshot.project || !Array.isArray(snapshot.layers)) {
          reject(new Error('Invalid project file — missing project or layers fields'))
          return
        }
        resolve(snapshot)
      } catch {
        reject(new Error('Could not parse file as JSON'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// ── Auto-save ──────────────────────────────────────────────────────────────

let autoSaveTimer = null

export function startAutoSave(intervalMs = 30000) {
  stopAutoSave()
  autoSaveTimer = setInterval(async () => {
    try {
      await saveAutoSave()
    } catch (e) {
      console.warn('[AutoSave] failed:', e)
    }
  }, intervalMs)
}

export function stopAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  autoSaveTimer = null
}

export async function saveAutoSave() {
  const profileId = useAppStore.getState().activeProfile?.id || null
  const snapshot = useAppStore.getState().serialize()
  snapshot.profileId = profileId
  await localforage.setItem(autoSaveKeyFor(profileId), snapshot)
}

export async function loadAutoSave() {
  const profileId = useAppStore.getState().activeProfile?.id || null
  return await localforage.getItem(autoSaveKeyFor(profileId))
}

export async function clearAutoSave() {
  const profileId = useAppStore.getState().activeProfile?.id || null
  await localforage.removeItem(autoSaveKeyFor(profileId))
}

/** Saves the current session under a specific identity — used when switching away from a profile. */
export async function saveSessionFor(profileId) {
  const snapshot = useAppStore.getState().serialize()
  snapshot.profileId = profileId
  await localforage.setItem(autoSaveKeyFor(profileId), snapshot)
}

/** Loads the last-open session for a specific identity — used when switching into a profile. */
export async function loadSessionFor(profileId) {
  return await localforage.getItem(autoSaveKeyFor(profileId))
}

// ── Panel layout persistence ───────────────────────────────────────────────

export function savePanelState() {
  const { panels } = useAppStore.getState()
  try {
    localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(panels))
  } catch {}
}

export function loadPanelState() {
  try {
    const raw = localStorage.getItem(PANEL_STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
