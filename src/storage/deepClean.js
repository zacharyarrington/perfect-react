// deepClean — full client-side wipe: every saved project/profile, all caches,
// and the live in-memory app state. Used by the "Deep Clean" settings action.

import localforage from 'localforage'
import useAppStore from '../store/useAppStore'
import { stopAutoSave } from './projectManager'

const LOCAL_STORAGE_KEYS = [
  'readymapgo_panels',
  'readymapgo_active_profile',
  'readymapgo_profile_prompted',
  'readymapgo_layout_presets',
  'rmg_tour_v1_seen',
]

export async function deepClean() {
  stopAutoSave()

  // IndexedDB — projects, autosave, profiles all live in the same localforage store.
  await localforage.clear()

  // localStorage keys owned by the app.
  for (const key of LOCAL_STORAGE_KEYS) {
    localStorage.removeItem(key)
  }

  // sessionStorage keys owned by the app.
  sessionStorage.removeItem('rmg_welcomed')

  // In-memory app state (this also drives useMapSync to tear down every
  // rendered source/layer on the live map, since layers resets to []).
  useAppStore.getState().resetAppState()

  // resetAppState() changes `panels`, which re-triggers usePersistence's
  // panel-save effect and re-writes readymapgo_panels with the (clean)
  // defaults — strip it again once that effect has had a chance to run.
  setTimeout(() => localStorage.removeItem('readymapgo_panels'), 0)
}
