// roles.config — role & permission definitions.
//
// A "permission" is just a string. Pages and panels declare the permission
// they require in pages.config / panels.config; anything without a
// `permission` field is available to everyone (including guests).
//
// To add a role: add an entry to ROLES.
// To add a permission: invent a string, list it under the roles that get it,
// and reference it from a page, panel, or <RequirePermission> block.

export const ROLES = {
  admin: {
    label: 'Administrator',
    badge: 'badge-red',
    // '*' grants every permission
    permissions: ['*'],
  },
  editor: {
    label: 'Editor',
    badge: 'badge-blue',
    permissions: ['content.edit', 'panels.notes'],
  },
  viewer: {
    label: 'Viewer',
    badge: 'badge-green',
    permissions: ['panels.notes'],
  },
}

/** True when `role` (a key of ROLES) grants `permission`.
 *  An undefined/null permission means "public" and always passes. */
export function roleHasPermission(role, permission) {
  if (!permission) return true
  const def = ROLES[role]
  if (!def) return false
  return def.permissions.includes('*') || def.permissions.includes(permission)
}
