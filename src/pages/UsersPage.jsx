// UsersPage — admin view for managing local users and their roles.
// Gated by the 'users.manage' permission in config/pages.config.jsx.
// The "add user" form is the reference example for the useForm + Field system.

import { useState, useEffect, useCallback } from 'react'
import useAppStore from '../store/useAppStore'
import { ROLES } from '../config/roles.config'
import {
  listUsers, createUser, updateUser, deleteUser, AVATAR_COLORS,
} from '../auth/userManager'
import { pushNotification } from '../notifications/notificationStore'
import { PageHeader, DataTable, ConfirmDialog } from '../components/ui'
import { useForm, Field, validators } from '../components/forms'
import { IconPlus, IconTrash, IconUsers, IconX } from '@tabler/icons-react'

function getInitials(name = '') {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

const ROLE_OPTIONS = Object.entries(ROLES).map(([value, r]) => ({ value, label: r.label }))

function AddUserForm({ existingNames, onCreated, onCancel }) {
  const addToast = useAppStore((s) => s.addToast)

  const form = useForm({
    initialValues: { username: '', role: 'viewer', color: AVATAR_COLORS[0] },
    validate: (v) => ({
      username: validators.compose(
        validators.required('Username is required'),
        validators.maxLength(32),
        (val) => existingNames.includes(val.trim().toLowerCase()) ? 'That username is already taken' : null,
      )(v.username),
    }),
    onSubmit: async (values) => {
      const user = await createUser(values)
      pushNotification({ title: 'User created', body: `${user.username} joined as ${ROLES[user.role].label}`, type: 'success' })
      addToast({ type: 'success', message: `User "${user.username}" created` })
      onCreated()
    },
  })

  return (
    <form className="user-add-form" onSubmit={form.handleSubmit}>
      <div style={{ flex: 1, minWidth: 160 }}>
        <Field.Text
          {...form.field('username')}
          placeholder="Username…"
          maxLength={32}
          autoFocus
        />
      </div>
      <div style={{ width: 160 }}>
        <Field.Select {...form.field('role')} options={ROLE_OPTIONS} />
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {AVATAR_COLORS.slice(0, 4).map((c) => (
          <button
            key={c}
            type="button"
            className={`login-color-swatch${form.values.color === c ? ' selected' : ''}`}
            style={{ background: c, width: 26, height: 26 }}
            onClick={() => form.setValue('color', c)}
            aria-label={c}
          />
        ))}
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={form.submitting}>
        {form.submitting ? 'Creating…' : 'Create'}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
    </form>
  )
}

export default function UsersPage() {
  const { currentUser, setCurrentUser, addToast } = useAppStore()
  const [users, setUsers] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const refresh = useCallback(() => listUsers().then(setUsers), [])
  useEffect(() => { refresh() }, [refresh])

  const handleRoleChange = async (user, role) => {
    const admins = users.filter((u) => u.role === 'admin')
    if (user.role === 'admin' && role !== 'admin' && admins.length === 1) {
      addToast({ type: 'warning', message: 'Cannot demote the last administrator' })
      refresh() // snap the select back
      return
    }
    const updated = await updateUser(user.id, { role })
    if (currentUser?.id === user.id) setCurrentUser(updated)
    refresh()
    addToast({ type: 'success', message: `${user.username} is now ${ROLES[role]?.label || role}` })
  }

  const handleDelete = async (user) => {
    await deleteUser(user.id)
    setDeleteTarget(null)
    refresh()
    addToast({ type: 'info', message: `Deleted "${user.username}"` })
  }

  const handleBulkDelete = async (selectedRows, clearSelection) => {
    const deletable = selectedRows.filter((u) => u.id !== currentUser?.id)
    const skipped = selectedRows.length - deletable.length
    await Promise.all(deletable.map((u) => deleteUser(u.id)))
    clearSelection()
    refresh()
    addToast({
      type: 'info',
      message: `Deleted ${deletable.length} user${deletable.length !== 1 ? 's' : ''}`
        + (skipped ? ' (skipped the account you\'re signed in as)' : ''),
    })
  }

  return (
    <div className="page">
      <PageHeader
        title="Users"
        subtitle={<>Manage who can use this app and what they can do. Roles and permissions are defined in <code>src/config/roles.config.js</code>.</>}
      />

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconUsers size={18} /> {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
          {!showAdd && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
              <IconPlus size={14} /> Add User
            </button>
          )}
        </div>

        {showAdd && (
          <AddUserForm
            existingNames={users.map((u) => u.username.toLowerCase())}
            onCreated={() => { setShowAdd(false); refresh() }}
            onCancel={() => setShowAdd(false)}
          />
        )}

        <DataTable
          searchable
          selectable
          exportFilename="users"
          bulkActions={(selectedRows, clearSelection) => (
            <>
              <button className="btn btn-danger btn-xs" onClick={() => handleBulkDelete(selectedRows, clearSelection)}>
                <IconTrash size={12} /> Delete
              </button>
              <button className="btn btn-ghost btn-xs" onClick={clearSelection}>
                <IconX size={12} /> Clear
              </button>
            </>
          )}
          emptyTitle="No users yet"
          emptyDesc="The first user created becomes the administrator."
          columns={[
            {
              key: 'username', label: 'User', sortable: true,
              render: (user) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="profile-avatar" style={{ background: user.color }}>{getInitials(user.username)}</div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</span>
                  {user.id === currentUser?.id && <span className="badge badge-teal">you</span>}
                </div>
              ),
            },
            {
              key: 'role', label: 'Role',
              csvValue: (user) => ROLES[user.role]?.label || user.role,
              render: (user) => (
                <select
                  className="select input-sm"
                  style={{ width: 150 }}
                  value={user.role}
                  onChange={(e) => handleRoleChange(user, e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              ),
            },
            {
              key: 'createdAt', label: 'Created', sortable: true, priority: 'low',
              render: (user) => new Date(user.createdAt).toLocaleDateString(),
              csvValue: (user) => new Date(user.createdAt).toISOString(),
            },
            {
              key: 'actions', label: '', width: 44,
              render: (user) => (
                <button
                  className="btn btn-icon btn-ghost btn-xs"
                  data-tooltip={user.id === currentUser?.id ? "Can't delete yourself" : 'Delete user'}
                  onClick={() => user.id !== currentUser?.id && setDeleteTarget(user)}
                  style={{ opacity: user.id === currentUser?.id ? 0.3 : 1 }}
                >
                  <IconTrash size={14} />
                </button>
              ),
            },
          ]}
          rows={users}
        />
      </div>

      <div className="card">
        <div className="card-title">Roles</div>
        <div className="data-table-wrapper" style={{ marginTop: 8 }}>
          <table className="data-table">
            <thead>
              <tr><th>Role</th><th>Permissions</th></tr>
            </thead>
            <tbody>
              {Object.entries(ROLES).map(([key, r]) => (
                <tr key={key}>
                  <td><span className={`badge ${r.badge}`}>{r.label}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {r.permissions.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user?"
        message={deleteTarget && `Remove "${deleteTarget.username}"? This can't be undone.`}
        danger
        confirmLabel="Delete"
        onConfirm={() => handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
