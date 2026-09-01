// roles.config — default role & permission definitions, shipped with the
// template. These are the seed values a fresh install starts with — the
// live, editable source of truth at runtime is rolesStore.js (localforage,
// overlaid on top of DEFAULT_ROLES below). Edit here to change what a fresh
// install ships with; use the Roles editor on the Users page to change roles
// on a running install without touching source.
//
// A "permission" is just a string. Pages and panels declare the permission
// they require in pages.config / panels.config; anything without a
// `permission` field is available to everyone (including guests).
//
// To add a role: add an entry to DEFAULT_ROLES.
// To add a permission: invent a string, list it under the roles that get it,
// and reference it from a page, panel, or <RequirePermission> block. The
// Roles editor's permission checklist auto-discovers permission strings from
// pages.config.jsx/panels.config.jsx — see PERMISSION_CATALOG below — so a
// brand-new permission string only needs to exist on a registry entry (or
// be added to EXTRA_PERMISSIONS here) to show up there.

export const DEFAULT_ROLES = {
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

// Permission strings that exist (e.g. checked via <RequirePermission> in
// custom app code) but aren't declared on any pages.config/panels.config
// entry, so PERMISSION_CATALOG in rolesStore.js can't auto-discover them.
// List them here to have them show up in the Roles editor's checklist too.
export const EXTRA_PERMISSIONS = ['content.edit']

// Badge colors available to pick from when creating/editing a role in the
// Roles editor — matches the palette already used by DEFAULT_ROLES/AVATAR_COLORS.
export const BADGE_OPTIONS = ['badge-red', 'badge-blue', 'badge-green', 'badge-teal', 'badge-purple', 'badge-amber']
