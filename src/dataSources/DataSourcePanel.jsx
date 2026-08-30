// DataSourcePanel — import CSV files, preview/rename/delete them. Imported
// files show up immediately in every widget's "Data source" dropdown via
// csvProvider.js reading the same storage this panel writes to.
//
// PanelHost mounts every registered panel unconditionally at app start (only
// the visual FloatingPanel chrome toggles on open/close — see PanelHost.jsx
// and FloatingPanel.jsx), so THIS component itself only mounts once, ever.
// That means a plain "fetch on mount" effect only ever sees the dataset list
// as it existed at app load: a dataset imported through any OTHER path (the
// inline "+ Import CSV…" shortcut in a widget's config form, or a shared
// dashboard's snapshot rehydration — both call csvDatasets.js directly, not
// through this panel) would silently never appear here, no matter how many
// times the panel is opened and closed. Reproduced exactly this way: a
// dashboard import rehydrated a CSV snapshot into real storage, confirmed
// present in IndexedDB, yet this panel kept showing "no datasets" through
// three separate open/close cycles. Fixed by subscribing to
// onDatasetsChanged, which every mutator in csvDatasets.js already notifies
// on — this panel was simply never listening.

import { useState, useEffect, useCallback, useRef } from 'react'
import FloatingPanel from '../panels/FloatingPanel'
import useAppStore from '../store/useAppStore'
import { ConfirmDialog, DataTable } from '../components/ui'
import {
  listCsvDatasets, importCsvFile, renameCsvDataset, deleteCsvDataset, onDatasetsChanged,
} from './csvDatasets'
import {
  IconFileImport, IconTrash, IconPencil, IconEye, IconCheck, IconDatabase,
} from '@tabler/icons-react'

export default function DataSourcePanel() {
  const addToast = useAppStore((s) => s.addToast)
  const [datasets, setDatasets] = useState([])
  const [importing, setImporting] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const importRef = useRef(null)

  const refresh = useCallback(() => listCsvDatasets().then(setDatasets), [])
  useEffect(() => {
    refresh()
    return onDatasetsChanged(refresh)
  }, [refresh])

  const handleImport = async (file) => {
    if (!file) return
    setImporting(true)
    try {
      const { dataset, skipped } = await importCsvFile(file)
      refresh()
      addToast({
        type: 'success',
        message: skipped > 0
          ? `Imported "${dataset.name}" — ${dataset.rowCount} rows (${skipped} skipped)`
          : `Imported "${dataset.name}" — ${dataset.rowCount} rows`,
      })
    } catch (e) {
      addToast({ type: 'error', message: `Import failed: ${e.message}` })
    } finally {
      setImporting(false)
      importRef.current.value = ''
    }
  }

  const handleRename = async (id) => {
    if (!renameValue.trim()) { setRenamingId(null); return }
    try {
      await renameCsvDataset(id, renameValue.trim())
      refresh()
    } catch (e) {
      addToast({ type: 'error', message: e.message })
    }
    setRenamingId(null)
  }

  const handleDelete = async (id) => {
    await deleteCsvDataset(id)
    setDeleteTarget(null)
    if (previewId === id) setPreviewId(null)
    refresh()
    addToast({ type: 'info', message: 'Dataset deleted' })
  }

  const preview = datasets.find((d) => d.id === previewId)

  return (
    <FloatingPanel
      panelKey="datasources"
      title="Data Sources"
      icon={<IconDatabase size={16} />}
      defaultWidth={340}
      defaultHeight={440}
    >
      <div className="panel-section">
        <button
          className="btn btn-primary btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => importRef.current?.click()}
          disabled={importing}
        >
          <IconFileImport size={14} /> {importing ? 'Importing…' : 'Import CSV'}
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => handleImport(e.target.files?.[0])}
        />
      </div>

      <div className="panel-section">
        <div className="section-label">Imported files</div>
        {datasets.length === 0 ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Import a CSV file to use it as a data source in any widget.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {datasets.map((d) => (
              <div key={d.id} className="dataset-row">
                {renamingId === d.id ? (
                  <input
                    className="input input-sm"
                    style={{ flex: 1 }}
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(d.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                  />
                ) : (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dataset-row-name">{d.name}</div>
                      <div className="dataset-row-meta">{d.rowCount} rows · {d.fields.length} fields</div>
                    </div>
                    <button
                      className="btn btn-icon btn-ghost btn-xs"
                      data-tooltip="Preview"
                      onClick={() => setPreviewId(previewId === d.id ? null : d.id)}
                    >
                      {previewId === d.id ? <IconCheck size={13} /> : <IconEye size={13} />}
                    </button>
                    <button
                      className="btn btn-icon btn-ghost btn-xs"
                      data-tooltip="Rename"
                      onClick={() => { setRenamingId(d.id); setRenameValue(d.name) }}
                    >
                      <IconPencil size={13} />
                    </button>
                    <button
                      className="btn btn-icon btn-ghost btn-xs"
                      data-tooltip="Delete"
                      onClick={() => setDeleteTarget(d)}
                    >
                      <IconTrash size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div className="panel-section">
          <div className="section-label">Preview — {preview.name}</div>
          <DataTable
            columns={preview.fields.slice(0, 6).map((f) => ({ key: f.key, label: f.label }))}
            rows={preview.rows}
            pageSize={5}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete dataset?"
        message={deleteTarget && `"${deleteTarget.name}" will no longer be available as a data source. Widgets bound to it will show an error until rebound.`}
        danger
        confirmLabel="Delete"
        onConfirm={() => handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </FloatingPanel>
  )
}
