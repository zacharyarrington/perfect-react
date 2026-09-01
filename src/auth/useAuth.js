// useAuth — the one hook components use for identity & permissions.
//
//   const { user, role, isGuest, isAdmin, hasPermission, signOut } = useAuth()

import { useCallback } from 'react'
import useAppStore from '../store/useAppStore'
import APP_CONFIG from '../config/app.config'
import { ROLES, roleHasPermission } from '../config/roles.config'
import { clearActiveUserId } from './userManager'
import { logAction } from '../audit/auditStore'

export default function useAuth() {
  const user = useAppStore((s) => s.currentUser)
  const setShowLoginDialog = useAppStore((s) => s.setShowLoginDialog)

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
    roleLabel: ROLES[role]?.label || 'Guest',
    isGuest,
    isAdmin: role === 'admin',
    hasPermission,
    signOut,
    openLogin: () => setShowLoginDialog(true),
  }
}
