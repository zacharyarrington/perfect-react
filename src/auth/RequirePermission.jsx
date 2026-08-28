// RequirePermission — declarative permission gate.
//
//   <RequirePermission permission="users.manage">…</RequirePermission>
//
// Renders children when the current role grants the permission; otherwise
// renders `fallback` (defaults to a friendly "restricted" state for page-level
// use, or pass fallback={null} to hide the content entirely).

import { IconLock } from '@tabler/icons-react'
import useAuth from './useAuth'

export function RestrictedNotice({ permission }) {
  const { isGuest, openLogin } = useAuth()
  return (
    <div className="empty-state" style={{ height: '100%' }}>
      <div className="empty-state-icon"><IconLock size={36} /></div>
      <div className="empty-state-title">Access restricted</div>
      <div className="empty-state-desc">
        Your current role doesn&apos;t include <code>{permission}</code>.
      </div>
      {isGuest && (
        <button className="btn btn-primary btn-sm" onClick={openLogin}>
          Sign in
        </button>
      )}
    </div>
  )
}

export default function RequirePermission({ permission, fallback, children }) {
  const { hasPermission } = useAuth()
  if (hasPermission(permission)) return children
  if (fallback !== undefined) return fallback
  return <RestrictedNotice permission={permission} />
}
