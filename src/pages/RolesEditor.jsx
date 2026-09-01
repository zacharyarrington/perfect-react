// RolesEditor — create/edit/delete roles and their permission checklist.
// Rendered inside UsersPage's "Roles" card. Persists via rolesStore.js
// (localforage, overlaid on config/roles.config.js's DEFAULT_ROLES) — see
// that file's header for how the runtime override layer works.

import { useState } from 'react'
import useRolesStore, { PERMISSION_CATALOG } from '../config/rolesStore'
import { BADGE_OPTIONS } from '../config/roles.config'
import { Modal, ConfirmDialog } from '../components/ui'
import { useForm, Field, validators } from '../components/forms'
import useAppStore from '../store/useAppStore'
import { logAction } from '../audit/auditStore'
import { IconPlus, IconPencil, IconTrash, IconLock } from '@tabler/icons-react'

function slugify(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function RoleForm({ roleId, initial, existingIds, onSaved, onCancel }) {
  const saveRole = useRolesStore((s) => s.saveRole)
  const addToast = useAppStore((s) => s.addToast)
  const isEditing = Boolean(roleId)

  const form = useForm({
    initialValues: {
      label: initial?.label || '',
      badge: initial?.badge || BADGE_OPTIONS[0],
      permissions: initial?.permissions || [],
    },
    validate: (v) => ({
      label: validators.compose(
        validators.required('Role name is required'),
        (val) => {
          if (isEditing) return null
          const id = slugify(val)
          if (!id) return 'Role name must contain at least one letter or number'
          return existingIds.includes(id) ? 'A role with this name already exists' : null
        },
      )(v.label),
    }),
    onSubmit: async (values) => {
      const id = isEditing ? roleId : slugify(values.label)
      await saveRole(id, { label: values.label.trim(), badge: values.badge, permissions: values.permissions })
      logAction({ action: isEditing ? 'role.updated' : 'role.created', target: values.label.trim() })
      addToast({ type: 'success', message: `Role "${values.label.trim()}" saved` })
      onSaved()
    },
  })

  const togglePermission = (perm) => {
    const has = form.values.permissions.includes(perm)
    form.setValue('permissions', has
      ? form.values.permissions.filter((p) => p !== perm)
      : [...form.values.permissions, perm])
  }

  const isFullAccess = form.values.permissions.includes('*')

  return (
    <form onSubmit={form.handleSubmit}>
      <Field.Text label="Role name" {...form.field('label')} placeholder="e.g. Support Agent" autoFocus />

      <div className="form-row" style={{ marginTop: 12 }}>
        <label className="label">Badge color</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {BADGE_OPTIONS.map((b) => (
            <button
              key={b}
              type="button"
              className={`role-badge-swatch badge ${b}${form.values.badge === b ? ' selected' : ''}`}
              onClick={() => form.setValue('badge', b)}
              aria-label={b}
            >
              Aa
            </button>
          ))}
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <label className="label">Permissions</label>
        <label className="role-permission-row role-permission-wildcard">
          <input type="checkbox" checked={isFullAccess} onChange={() => togglePermission('*')} />
          <span>Full access <code>*</code> — grants every permission, including future ones</span>
        </label>
        <div className="role-permission-list" style={{ opacity: isFullAccess ? 0.4 : 1, pointerEvents: isFullAccess ? 'none' : 'auto' }}>
          {PERMISSION_CATALOG.length === 0 ? (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              No gated pages/panels yet — add a <code>permission:</code> field to a registry entry to see it here.
            </p>
          ) : PERMISSION_CATALOG.map((perm) => (
            <label key={perm} className="role-permission-row">
              <input
                type="checkbox"
                checked={form.values.permissions.includes(perm)}
                onChange={() => togglePermission(perm)}
              />
              <code>{perm}</code>
            </label>
          ))}
        </div>
      </div>

      <div className="login-form-actions" style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={form.submitting}>
          {form.submitting ? 'Saving…' : isEditing ? 'Save Role' : 'Create Role'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export default function RolesEditor({ users }) {
  const roles = useRolesStore((s) => s.roles)
  const deleteRole = useRolesStore((s) => s.deleteRole)
  const addToast = useAppStore((s) => s.addToast)
  const [editingId, setEditingId] = useState(undefined) // undefined = closed, null = new, string = editing that id
  const [deleteTarget, setDeleteTarget] = useState(null)

  const roleEntries = Object.entries(roles)
  const existingIds = roleEntries.map(([id]) => id)

  const handleDelete = async (id) => {
    const inUse = users.some((u) => u.role === id)
    if (inUse) {
      addToast({ type: 'warning', message: `Can't delete "${roles[id]?.label}" — it's still assigned to a user` })
      setDeleteTarget(null)
      return
    }
    await deleteRole(id)
    logAction({ action: 'role.deleted', target: roles[id]?.label || id })
    addToast({ type: 'info', message: `Deleted role "${roles[id]?.label || id}"` })
    setDeleteTarget(null)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="card-title">Roles</div>
        <button className="btn btn-primary btn-sm" onClick={() => setEditingId(null)}>
          <IconPlus size={14} /> New Role
        </button>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Role</th><th>Permissions</th><th style={{ width: 80 }}></th></tr>
          </thead>
          <tbody>
            {roleEntries.map(([id, r]) => {
              const inUse = users.some((u) => u.role === id)
              return (
                <tr key={id}>
                  <td><span className={`badge ${r.badge}`}>{r.label}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {r.permissions.join(', ')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-icon btn-ghost btn-xs" data-tooltip="Edit role" onClick={() => setEditingId(id)}>
                        <IconPencil size={13} />
                      </button>
                      {id === 'admin' ? (
                        <span className="btn btn-icon btn-ghost btn-xs" data-tooltip="The admin role can't be deleted" style={{ opacity: 0.35, cursor: 'default' }}>
                          <IconLock size={13} />
                        </span>
                      ) : (
                        <button
                          className="btn btn-icon btn-ghost btn-xs"
                          data-tooltip={inUse ? "Still assigned to a user" : 'Delete role'}
                          onClick={() => setDeleteTarget(id)}
                          style={{ opacity: inUse ? 0.35 : 1 }}
                        >
                          <IconTrash size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={editingId !== undefined}
        onClose={() => setEditingId(undefined)}
        title={editingId ? `Edit "${roles[editingId]?.label}"` : 'New Role'}
        width={440}
      >
        {editingId !== undefined && (
          <RoleForm
            roleId={editingId}
            initial={editingId ? roles[editingId] : null}
            existingIds={existingIds}
            onSaved={() => setEditingId(undefined)}
            onCancel={() => setEditingId(undefined)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete role?"
        message={deleteTarget && `Remove "${roles[deleteTarget]?.label}"? Users assigned to it must be reassigned first. This can't be undone.`}
        danger
        confirmLabel="Delete"
        onConfirm={() => handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
