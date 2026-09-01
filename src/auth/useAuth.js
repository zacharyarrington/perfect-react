// useAuth — the one hook components use for identity & permissions.
//
//   const { user, role, isGuest, isAdmin, hasPermission, signOut } = useAuth()

import { useCallback } from 'react'
import useAppStore from '../store/useAppStore'
import APP_CONFIG from '../config/app.config'
import useRolesStore, { roleHasPermission } from '../config/rolesStore'
import { clearActiveUserId } from './userManager'
import { logAction } from '../audit/auditStore'

export default function useAuth() {
  const user = useAppStore((s) => s.currentUser)
  const setShowLoginDialog = useAppStore((s) => s.setShowLoginDialog)
  // Subscribing to `roles` here (even though hasPermission reads the store
  // fresh via getState() on every call, not this variable) is what makes any
  // component calling useAuth() re-render after a role is edited/added/
  // deleted — without it, a component that only reads `hasPermission` back
  // out would keep evaluating against whatever roles existed when it first
  // rendered, since a useCallback's identity alone doesn't force a re-render.
  const roles = useRolesStore((s) => s.roles)

  const isGuest = !user
  // Guests act with the configured guest role (or none when guests are disabled)
  const role = user?.role || (APP_CONFIG.allowGuest ? APP_CONFIG.guestRole : null)

  const hasPermission = useCallback(
    (permission) => roleHasPermission(role, permission),
    [role]
  )

  const signOut = useCallback(() => {
    // Log before clearing the active user id — logAction stamps whoever is
    // currently active, so this must run while that's still the signer-outer.
    if (user) logAction({ action: 'signed_out', target: user.username })
    clearActiveUserId()
    const store = useAppStore.getState()
    store.resetAppState()
    store.addToast({ type: 'info', message: 'Signed out' })
  }, [user])

  return {
    user,
    role,
    roleLabel: roles[role]?.label || 'Guest',
    isGuest,
    isAdmin: role === 'admin',
    hasPermission,
    signOut,
    openLogin: () => setShowLoginDialog(true),
  }
}
