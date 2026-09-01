// AuditLogPage — admin view of the permanent activity record: who did what,
// and when. Gated by the 'audit.view' permission in config/pages.config.jsx.
// Distinct from the notification bell (dismissable, user-facing) — this is
// the durable log an admin audits later.

import { useState, useEffect, useCallback } from 'react'
import useAuditStore from '../audit/auditStore'
import { PageHeader, DataTable, ConfirmDialog } from '../components/ui'
import { IconHistory, IconTrash } from '@tabler/icons-react'

// action key -> human label + badge color, e.g. 'user.created' -> 'User created'
const ACTION_LABELS = {
  'user.created':   { label: 'User created',   badge: 'badge-green' },
  'user.deleted':   { label: 'User deleted',   badge: 'badge-red' },
  'role.changed':   { label: 'Role changed',   badge: 'badge-blue' },
  'role.created':   { label: 'Role created',   badge: 'badge-green' },
  'role.updated':   { label: 'Role updated',   badge: 'badge-blue' },
  'role.deleted':   { label: 'Role deleted',   badge: 'badge-red' },
  'signed_in':      { label: 'Signed in',      badge: 'badge-teal' },
  'signed_out':     { label: 'Signed out',     badge: '' },
}

function describeMeta(meta) {
  if (!meta) return ''
  if (meta.from && meta.to) return `${meta.from} → ${meta.to}`
  return ''
}

export default function AuditLogPage() {
  const { entries, loaded, load, clear } = useAuditStore()
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => { if (!loaded) load() }, [loaded, load])

  const handleClear = useCallback(() => {
    clear()
    setConfirmClear(false)
  }, [clear])

  return (
    <div className="page">
      <PageHeader
        title="Audit Log"
        subtitle="A permanent record of account and administrative activity on this device."
      />

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconHistory size={18} /> {entries.length} event{entries.length !== 1 ? 's' : ''}
          </div>
          {entries.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(true)}>
              <IconTrash size={14} /> Clear log
            </button>
          )}
        </div>

        <DataTable
          searchable
          exportFilename="audit-log"
          pageSize={25}
          emptyTitle="No activity yet"
          emptyDesc="User and admin actions will show up here as they happen."
          columns={[
            {
              key: 'ts', label: 'Time', sortable: true,
              render: (e) => new Date(e.ts).toLocaleString(),
              csvValue: (e) => e.ts,
            },
            {
              key: 'username', label: 'User', sortable: true,
              render: (e) => e.username,
            },
            {
              key: 'action', label: 'Action', sortable: true,
              csvValue: (e) => ACTION_LABELS[e.action]?.label || e.action,
              render: (e) => (
                <span className={`badge ${ACTION_LABELS[e.action]?.badge || ''}`}>
                  {ACTION_LABELS[e.action]?.label || e.action}
                </span>
              ),
            },
            {
              key: 'target', label: 'Target',
              render: (e) => e.target || <span style={{ color: 'var(--text-muted)' }}>—</span>,
            },
            {
              key: 'meta', label: 'Details', priority: 'low',
              csvValue: (e) => describeMeta(e.meta),
              render: (e) => <span style={{ color: 'var(--text-secondary)' }}>{describeMeta(e.meta)}</span>,
            },
          ]}
          rows={entries}
        />
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear audit log?"
        message="This permanently deletes all recorded activity on this device. This can't be undone."
        danger
        confirmLabel="Clear"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
