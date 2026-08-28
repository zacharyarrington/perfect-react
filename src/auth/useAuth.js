// useAuth — the one hook components use for identity & permissions.
//
//   const { user, role, isGuest, isAdmin, hasPermission, signOut } = useAuth()

import { useCallback } from 'react'
import useAppStore from '../store/useAppStore'
import APP_CONFIG from '../config/app.config'
import { ROLES, roleHasPermission } from '../config/roles.config'
import { clearActiveUserId } from './userManager'

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
    clearActiveUserId()
    const store = useAppStore.getState()
    store.resetAppState()
    store.addToast({ type: 'info', message: 'Signed out' })
  }, [])

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
