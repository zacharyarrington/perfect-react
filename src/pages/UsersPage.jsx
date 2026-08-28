// UsersPage — admin view for managing local users and their roles.
// Gated by the 'users.manage' permission in config/pages.config.jsx.

import { useState, useEffect, useCallback } from 'react'
import useAppStore from '../store/useAppStore'
import { ROLES } from '../config/roles.config'
import {
  listUsers, createUser, updateUser, deleteUser, AVATAR_COLORS,
} from '../auth/userManager'
import { IconPlus, IconTrash, IconCheck, IconUsers } from '@tabler/icons-react'

function getInitials(name = '') {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

export default function UsersPage() {
  const { currentUser, setCurrentUser, addToast } = useAppStore()
  const [users, setUsers] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('viewer')
  const [newColor, setNewColor] = useState(AVATAR_COLORS[0])
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const refresh = useCallback(() => listUsers().then(setUsers), [])
  useEffect(() => { refresh() }, [refresh])

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      await createUser({ username: newName, color: newColor, role: newRole })
      setNewName('')
      setShowAdd(false)
      refresh()
      addToast({ type: 'success', message: `User "${newName.trim()}" created` })
    } catch (e) {
      addToast({ type: 'error', message: e.message })
    }
  }

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
    if (user.id === currentUser?.id) {
      addToast({ type: 'warning', message: 'You cannot delete the user you are signed in as' })
      return
    }
    await deleteUser(user.id)
    setDeleteConfirm(null)
    refresh()
    addToast({ type: 'info', message: `Deleted "${user.username}"` })
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">
          Manage who can use this app and what they can do. Roles and permissions are defined
          in <code>src/config/roles.config.js</code>.
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconUsers size={18} /> {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd((o) => !o)}>
            <IconPlus size={14} /> Add User
          </button>
        </div>

        {showAdd && (
          <div className="user-add-form">
            <input
              className="input"
              placeholder="Username…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              maxLength={32}
              autoFocus
            />
            <select className="select" value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ width: 160 }}>
              {Object.entries(ROLES).map(([key, r]) => (
                <option key={key} value={key}>{r.label}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              {AVATAR_COLORS.slice(0, 4).map((c) => (
                <button
                  key={c}
                  className={`login-color-swatch${newColor === c ? ' selected' : ''}`}
                  style={{ background: c, width: 26, height: 26 }}
                  onClick={() => setNewColor(c)}
                  aria-label={c}
                >
                  {newColor === c && <IconCheck size={11} style={{ color: '#fff' }} />}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!newName.trim()}>
              Create
            </button>
          </div>
        )}

        {users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><IconUsers size={32} /></div>
            <div className="empty-state-title">No users yet</div>
            <div className="empty-state-desc">The first user created becomes the administrator.</div>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="profile-avatar" style={{ background: user.color }}>
                          {getInitials(user.username)}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</span>
                        {user.id === currentUser?.id && <span className="badge badge-teal">you</span>}
                      </div>
                    </td>
                    <td>
                      <select
                        className="select input-sm"
                        style={{ width: 150 }}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                      >
                        {Object.entries(ROLES).map(([key, r]) => (
                          <option key={key} value={key}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      {deleteConfirm === user.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-danger btn-xs" onClick={() => handleDelete(user)}>Yes</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setDeleteConfirm(null)}>No</button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-icon btn-ghost btn-xs"
                          data-tooltip={user.id === currentUser?.id ? "Can't delete yourself" : 'Delete user'}
                          onClick={() => user.id !== currentUser?.id && setDeleteConfirm(user.id)}
                          style={{ opacity: user.id === currentUser?.id ? 0.3 : 1 }}
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    </div>
  )
}
