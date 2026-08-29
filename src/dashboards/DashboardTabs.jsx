// DashboardTabs — the tab strip: switch, rename-inline, pin, reorder
// (drag the tab itself, via native HTML5 drag-and-drop — deliberately not
// react-grid-layout, which is for the widget canvas, not a 1D tab strip),
// clone, delete, "+ New".

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useDashboardStore from './useDashboardStore'
import { ConfirmDialog } from '../components/ui'
import {
  IconPlus, IconPin, IconPinnedFilled, IconCopy, IconX,
} from '@tabler/icons-react'

export default function DashboardTabs({ activeDashboardId }) {
  const navigate = useNavigate()
  const {
    dashboards, createDashboard, updateDashboard, deleteDashboard,
    duplicateDashboard, reorderDashboards, togglePinned,
  } = useDashboardStore()

  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const dragIndexRef = useRef(null)

  // Pinned first, then insertion order — matches the "pin your favorites" ask directly.
  const sorted = [...dashboards].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return a.order - b.order
  })

  const goTo = (id) => navigate(`/dashboard/${id}`)

  const commitRename = (id) => {
    if (renameValue.trim()) updateDashboard(id, { name: renameValue.trim() })
    setRenamingId(null)
  }

  const handleDelete = (id) => {
    deleteDashboard(id)
    setDeleteTarget(null)
    const next = dashboards.find((d) => d.id !== id)
    if (activeDashboardId === id) goTo(next ? next.id : '')
  }

  const handleDragStart = (index) => { dragIndexRef.current = index }
  const handleDrop = (index) => {
    const from = dragIndexRef.current
    if (from === null || from === index) return
    reorderDashboards(from, index)
    dragIndexRef.current = null
  }

  return (
    <>
      <div className="dashboard-tabs">
        {sorted.map((d, i) => {
          const isActive = d.id === activeDashboardId
          return (
            <div
              key={d.id}
              className={`dashboard-tab${isActive ? ' active' : ''}`}
              draggable={renamingId !== d.id}
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onClick={() => renamingId !== d.id && goTo(d.id)}
            >
              <button
                className="dashboard-tab-pin"
                onClick={(e) => { e.stopPropagation(); togglePinned(d.id) }}
                data-tooltip={d.pinned ? 'Unpin' : 'Pin'}
              >
                {d.pinned ? <IconPinnedFilled size={13} /> : <IconPin size={13} />}
              </button>

              {renamingId === d.id ? (
                <input
                  className="dashboard-tab-rename-input"
                  value={renameValue}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(d.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(d.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                />
              ) : (
                <span
                  className="dashboard-tab-name"
                  onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(d.id); setRenameValue(d.name) }}
                  title={`${d.name} — double-click to rename`}
                >
                  {d.name}
                </span>
              )}

              <div className="dashboard-tab-actions">
                <button
                  className="btn btn-icon btn-xs"
                  onClick={(e) => { e.stopPropagation(); duplicateDashboard(d.id); }}
                  data-tooltip="Duplicate"
                >
                  <IconCopy size={12} />
                </button>
                <button
                  className="btn btn-icon btn-xs"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(d) }}
                  data-tooltip="Delete"
                  disabled={dashboards.length <= 1}
                  style={{ opacity: dashboards.length <= 1 ? 0.3 : 1 }}
                >
                  <IconX size={12} />
                </button>
              </div>
            </div>
          )
        })}

        <button
          className="dashboard-tab-add"
          onClick={() => { const id = createDashboard({}); goTo(id) }}
          data-tooltip="New dashboard"
        >
          <IconPlus size={16} />
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete dashboard?"
        message={deleteTarget && `Remove "${deleteTarget.name}" and its ${deleteTarget.widgets.length} widget${deleteTarget.widgets.length !== 1 ? 's' : ''}? This can't be undone.`}
        danger
        confirmLabel="Delete"
        onConfirm={() => handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
