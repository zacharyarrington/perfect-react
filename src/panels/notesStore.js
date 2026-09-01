// notesStore — multiple rich-text notes per user (or one shared slot for
// guests), replacing the old single-scratchpad NotesPanel. Same shape as
// auditStore.js/notificationStore.js (zustand + localforage, a flat list),
// plus the synchronous-localStorage-mirror durability pattern used
// everywhere else a debounced localforage write exists in this app (see
// pagehide-async-save-gap in the project's memory / dashboardStorage.js's
// header comment for the full writeup) — a note is exactly the kind of
// content a lost-on-quick-reload bug would be genuinely painful for.
//
//   import useNotesStore from './notesStore'
//   const { notes, activeId, createNote, updateNote, deleteNote } = useNotesStore()

import { create } from 'zustand'
import localforage from 'localforage'

const NOTES_KEY_PREFIX = 'appshell_notes_v2'       // list storage, per user/guest
const NOTES_SYNC_PREFIX = 'appshell_notes_v2_sync'  // localStorage durability mirror
const OLD_NOTES_KEY_PREFIX = 'appshell_notes'       // pre-multi-note single scratchpad
const SAVE_DEBOUNCE_MS = 800

const genId = () => `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

/** First non-empty line of the content (tags stripped), or a fallback — used
 *  as the note's list-item title whenever `title` hasn't been set explicitly. */
function deriveTitle(html) {
  const text = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return 'Untitled note'
  return text.length > 60 ? `${text.slice(0, 60)}…` : text
}

function mirrorToLocalStorageSync(key, notes, savedAt) {
  try {
    localStorage.setItem(`${NOTES_SYNC_PREFIX}_${key}`, JSON.stringify({ notes, savedAt }))
  } catch {
    // best-effort only; localforage remains the source of truth when this fails
  }
}

let saveTimer = null

const useNotesStore = create((set, get) => ({
  notes: [],           // [{ id, title, content, pinned, createdAt, updatedAt }]
  activeId: null,
  loaded: false,
  loadedForKey: null,   // which user/guest key `notes` currently reflects

  load: async (userKey) => {
    const key = userKey || 'guest'
    if (get().loadedForKey === key) return // already loaded for this user

    const storageKey = `${NOTES_KEY_PREFIX}_${key}`
    const stored = await localforage.getItem(storageKey)
    let notes = stored?.notes ?? null
    let savedAt = stored?.savedAt ?? 0

    // Mirror ahead of localforage (interrupted reload) wins, same freshness
    // check as every other pipeline in this app.
    try {
      const raw = localStorage.getItem(`${NOTES_SYNC_PREFIX}_${key}`)
      if (raw) {
        const mirror = JSON.parse(raw)
        if ((mirror.savedAt || 0) > savedAt) { notes = mirror.notes; savedAt = mirror.savedAt }
      }
    } catch {
      // corrupt/unavailable mirror — fall back to the localforage copy
    }

    // One-time migration: fold the old single-scratchpad string into note #1
    // so nobody's existing content silently vanishes under the new key.
    if (!notes) {
      const legacyText = await localforage.getItem(`${OLD_NOTES_KEY_PREFIX}_${key}`)
      notes = legacyText?.trim()
        ? [{ id: genId(), title: null, content: `<p>${legacyText.replace(/\n/g, '</p><p>')}</p>`, pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
        : []
    }

    set({
      notes,
      // Land on the list, not straight into the first note's editor — a
      // fresh panel open (or a reload) should show what's there, not assume
      // the user wants to resume editing whatever happened to be first.
      activeId: null,
      loaded: true,
      loadedForKey: key,
    })
  },

  scheduleSave: (userKey) => {
    const key = userKey || 'guest'
    const savedAt = Date.now()
    mirrorToLocalStorageSync(key, get().notes, savedAt)
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      localforage.setItem(`${NOTES_KEY_PREFIX}_${key}`, { notes: get().notes, savedAt }).catch(() => {})
    }, SAVE_DEBOUNCE_MS)
  },

  /** Flush any pending debounced save immediately — call on panel close/unmount/pagehide. */
  flush: (userKey) => {
    const key = userKey || 'guest'
    if (!saveTimer) return
    clearTimeout(saveTimer)
    saveTimer = null
    const savedAt = Date.now()
    mirrorToLocalStorageSync(key, get().notes, savedAt)
    localforage.setItem(`${NOTES_KEY_PREFIX}_${key}`, { notes: get().notes, savedAt }).catch(() => {})
  },

  createNote: (userKey) => {
    const note = {
      id: genId(), title: null, content: '', pinned: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    set((s) => ({ notes: [note, ...s.notes], activeId: note.id }))
    get().scheduleSave(userKey)
    return note.id
  },

  updateNote: (id, updates, userKey) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)),
    }))
    get().scheduleSave(userKey)
  },

  // Deleting the currently-open note returns to the list (activeId: null)
  // rather than auto-selecting whatever note happens to be next — landing
  // the user in an editor for a DIFFERENT note they never chose to open is
  // a worse experience than just showing the list, even though "select the
  // next note" is the more common pattern for a flat list UI. Deleting any
  // OTHER (not-currently-open) note — e.g. via a future list-item delete
  // affordance — leaves activeId untouched, since whatever's open didn't
  // change.
  deleteNote: (id, userKey) => {
    set((s) => {
      const notes = s.notes.filter((n) => n.id !== id)
      const activeId = s.activeId === id ? null : s.activeId
      return { notes, activeId }
    })
    get().scheduleSave(userKey)
  },

  togglePin: (id, userKey) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
    }))
    get().scheduleSave(userKey)
  },

  setActiveId: (id) => set({ activeId: id }),

  /** Sorted for display: pinned first, then most-recently-updated. */
  sortedNotes: () => {
    return [...get().notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updatedAt) - new Date(a.updatedAt)
    })
  },
}))

export { deriveTitle }
export default useNotesStore
