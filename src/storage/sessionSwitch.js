// sessionSwitch — save/restore the in-memory session across profile changes.
// Sign-out, switch-profile, and sign-in all funnel through here so the
// current map/layers are never silently discarded — they're stashed under
// the outgoing identity (profile or guest) and restored when that identity
// is active again. Only Deep Clean or deleting a profile actually erases data.

import useAppStore from '../store/useAppStore'
import { saveSessionFor, loadSessionFor } from './projectManager'

/**
 * Persists the current view under `outgoingProfileId` (null = guest), then
 * either loads `incomingProfileId`'s last session or resets to a blank view.
 */
export async function switchSession(outgoingProfileId, incomingProfile) {
  await saveSessionFor(outgoingProfileId).catch(() => {})

  const store = useAppStore.getState()
  store.resetAppState()
  store.setActiveProfile(incomingProfile)

  const incomingProfileId = incomingProfile?.id || null
  const snapshot = await loadSessionFor(incomingProfileId).catch(() => null)
  if (snapshot) {
    useAppStore.getState().loadFromSnapshot(snapshot)
  }
}
