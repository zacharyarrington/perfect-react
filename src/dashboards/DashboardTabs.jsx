// DashboardTabs — the tab strip: switch, rename-inline, pin, reorder
// (drag the tab itself, via native HTML5 drag-and-drop — deliberately not
// react-grid-layout, which is for the widget canvas, not a 1D tab strip),
// clone, delete, "+ New", plus sharing: each tab's menu can save it as a
// reusable template or export it as a .dashboard.json file; "Import" next
// to "+ New" brings a shared file straight onto the canvas.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useDashboardStore from './useDashboardStore'
import useAppStore from '../store/useAppStore'
import { ConfirmDialog, Modal } from '../components/ui'
import { Field, useForm } from '../components/forms'
import {
  saveDashboardTemplate, exportDashboardTemplate, importDashboardTemplateFromFile,
} from './dashboardTemplates'
import {
  IconPlus, IconPin, IconPinnedFilled, IconCopy, IconX, IconDots,
  IconDownload, IconDeviceFloppy, IconFileImport,
} from '@tabler/icons-react'

function SaveTemplateModal({ dashboard, onClose }) {
  const addToast = useAppStore((s) => s.addToast)
  const form = useForm({
    initialValues: { name: dashboard ? `${dashboard.name} Template` : '', description: '' },
    validate: (v) => ({ name: !v.name.trim() ? 'Name is required' : null }),
    onSubmit: async (values) => {
      await saveDashboardTemplate(dashboard.id, values.name, values.description)
      addToast({ type: 'success', message: `Saved "${values.name}" as a template` })
      onClose()
    },
  })

  return (
    <Modal
      open={Boolean(dashboard)}
      onClose={onClose}
      title="Save dashboard as template"
      width={400}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={form.handleSubmit} disabled={form.submitting}>
            {form.submitting ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form onSubmit={form.handleSubmit}>
        <Field.Text label="Name" required {...form.field('name')} />
        <Field.Textarea label="Description" hint="Optional" rows={2} {...form.field('description')} />
      </form>
    </Modal>
  )
}

export default function DashboardTabs({ activeDashboardId }) {
  const navigate = useNavigate()
  const addToast = useAppStore((s) => s.addToast)
  const {
    dashboards, createDashboard, updateDashboard, deleteDashboard,
    duplicateDashboard, reorderDashboards, togglePinned,
  } = useDashboardStore()

  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [templateTarget, setTemplateTarget] = useState(null)
  const [importing, setImporting] = useState(false)
  const dragIndexRef = useRef(null)
  const menuRef = useRef(null)
  const importRef = useRef(null)

  useEffect(() => {
    if (!menuOpenId) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenId])

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

  const handleExport = async (d) => {
    setMenuOpenId(null)
    const template = { name: d.name, dashboard: { widgets: d.widgets, gridCols: d.gridCols, rowHeight: d.rowHeight } }
    try {
      await exportDashboardTemplate(template)
    } catch (e) {
      addToast({ type: 'error', message: `Export failed: ${e.message}` })
    }
  }

  const handleImport = async (file) => {
    if (!file) return
    setImporting(true)
    try {
      const { dashboardId, rehydratedCount } = await importDashboardTemplateFromFile(file)
      addToast({
        type: 'success',
        message: rehydratedCount > 0
          ? `Dashboard imported — ${rehydratedCount} embedded dataset${rehydratedCount !== 1 ? 's' : ''} restored`
          : 'Dashboard imported',
      })
      goTo(dashboardId)
    } catch (e) {
      addToast({ type: 'error', message: `Import failed: ${e.message}` })
    } finally {
      setImporting(false)
      importRef.current.value = ''
    }
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
        {/* Only this inner element scrolls horizontally — see the
            .dashboard-tabs / .dashboard-tab-scroll comment in index.css for
            why the scroll and the tooltip-clipping fix are split across two
            elements instead of living on one. */}
        <div className="dashboard-tab-scroll">
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

              <div className="dashboard-tab-actions" ref={menuOpenId === d.id ? menuRef : null}>
                <button
                  className="btn btn-icon btn-xs"
                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === d.id ? null : d.id) }}
                  data-tooltip="More"
                >
                  <IconDots size={12} />
                </button>
                {menuOpenId === d.id && (
                  <div className="profile-dropdown dashboard-tab-menu" onClick={(e) => e.stopPropagation()}>
                    <button className="profile-dropdown-item" onClick={() => { duplicateDashboard(d.id); setMenuOpenId(null) }}>
                      <IconCopy size={14} /> Duplicate
                    </button>
                    <button className="profile-dropdown-item" onClick={() => { setTemplateTarget(d); setMenuOpenId(null) }}>
                      <IconDeviceFloppy size={14} /> Save as template
                    </button>
                    <button className="profile-dropdown-item" onClick={() => handleExport(d)}>
                      <IconDownload size={14} /> Export file
                    </button>
                    <div className="profile-dropdown-divider" />
                    <button
                      className="profile-dropdown-item profile-dropdown-signout"
                      onClick={() => { setMenuOpenId(null); dashboards.length > 1 && setDeleteTarget(d) }}
                      disabled={dashboards.length <= 1}
                    >
                      <IconX size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        </div>

        <button
          className="dashboard-tab-add"
          onClick={() => { const id = createDashboard({}); goTo(id) }}
          data-tooltip="New dashboard"
        >
          <IconPlus size={16} />
        </button>
        <button
          className="dashboard-tab-add"
          onClick={() => importRef.current?.click()}
          data-tooltip="Import dashboard file"
          disabled={importing}
        >
          <IconFileImport size={15} />
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => handleImport(e.target.files?.[0])}
        />
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

      <SaveTemplateModal dashboard={templateTarget} onClose={() => setTemplateTarget(null)} />
    </>
  )
}
