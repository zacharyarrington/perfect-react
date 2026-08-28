// LayoutsPanel — save the current workspace as a named template, apply
// built-in or saved templates, and share them as .layout.json files.

import { useState, useEffect, useCallback, useRef } from 'react'
import FloatingPanel from '../panels/FloatingPanel'
import useAppStore from '../store/useAppStore'
import {
  BUILTIN_TEMPLATES, listTemplates, saveTemplate, deleteTemplate,
  applyTemplate, exportTemplate, importTemplateFromFile,
} from './layoutTemplates'
import {
  IconLayoutBoard, IconDeviceFloppy, IconTrash, IconDownload,
  IconFileImport, IconCheck,
} from '@tabler/icons-react'

export default function LayoutsPanel() {
  const addToast = useAppStore((s) => s.addToast)
  const [templates, setTemplates] = useState([])
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const importRef = useRef(null)

  const refresh = useCallback(() => listTemplates().then(setTemplates), [])
  useEffect(() => { refresh() }, [refresh])

  const handleSave = async () => {
    if (!newName.trim()) return
    try {
      await saveTemplate(newName)
      setNewName('')
      refresh()
      addToast({ type: 'success', message: `Layout "${newName.trim()}" saved` })
    } catch (e) {
      addToast({ type: 'error', message: e.message })
    }
  }

  const handleApply = (tpl) => {
    applyTemplate(tpl)
    addToast({ type: 'success', message: `Applied "${tpl.name}"` })
  }

  const handleImport = async (file) => {
    if (!file) return
    try {
      const tpl = await importTemplateFromFile(file)
      refresh()
      addToast({ type: 'success', message: `Imported "${tpl.name}"` })
    } catch (e) {
      addToast({ type: 'error', message: `Import failed: ${e.message}` })
    }
    importRef.current.value = ''
  }

  const row = (tpl) => (
    <div key={tpl.id} className="layout-template-row">
      {confirmDelete === tpl.id ? (
        <div className="login-delete-confirm" style={{ padding: '6px 10px' }}>
          <span style={{ flex: 1 }}>Delete "{tpl.name}"?</span>
          <button
            className="btn btn-danger btn-xs"
            onClick={async () => { await deleteTemplate(tpl.id); setConfirmDelete(null); refresh() }}
          >
            Yes
          </button>
          <button className="btn btn-ghost btn-xs" onClick={() => setConfirmDelete(null)}>No</button>
        </div>
      ) : (
        <>
          <button className="layout-template-apply" onClick={() => handleApply(tpl)} title="Apply this layout">
            <IconCheck size={13} className="layout-template-check" />
            <span className="layout-template-name">{tpl.name}</span>
            {tpl.description && <span className="layout-template-desc">{tpl.description}</span>}
          </button>
          <button
            className="btn btn-icon btn-ghost btn-xs"
            data-tooltip="Export as file"
            onClick={() => exportTemplate(tpl)}
          >
            <IconDownload size={13} />
          </button>
          {!tpl.builtin && (
            <button
              className="btn btn-icon btn-ghost btn-xs"
              data-tooltip="Delete"
              onClick={() => setConfirmDelete(tpl.id)}
            >
              <IconTrash size={13} />
            </button>
          )}
        </>
      )}
    </div>
  )

  return (
    <FloatingPanel
      panelKey="layouts"
      title="Layouts"
      icon={<IconLayoutBoard size={16} />}
      defaultWidth={320}
      defaultHeight={420}
    >
      {/* Save current */}
      <div className="panel-section">
        <div className="section-label">Save current workspace</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input input-sm"
            placeholder="Layout name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            maxLength={40}
          />
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!newName.trim()}>
            <IconDeviceFloppy size={14} /> Save
          </button>
        </div>
      </div>

      {/* Built-ins */}
      <div className="panel-section">
        <div className="section-label">Built-in</div>
        {BUILTIN_TEMPLATES.map(row)}
      </div>

      {/* Saved */}
      <div className="panel-section">
        <div className="section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Saved</span>
          <button className="btn-link" style={{ fontSize: 'var(--text-xs)', padding: 0 }} onClick={() => importRef.current?.click()}>
            <IconFileImport size={12} /> Import file
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => handleImport(e.target.files?.[0])}
        />
        {templates.length === 0 ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Arrange your panels, then save the workspace above. Exported <code>.layout.json</code> files
            can be imported by anyone using this app.
          </p>
        ) : (
          templates.map(row)
        )}
      </div>
    </FloatingPanel>
  )
}
