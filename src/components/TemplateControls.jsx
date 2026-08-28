import { useState, useRef, useEffect } from 'react'
import useAppStore from '../store/useAppStore'
import {
  listStyleTemplates, saveStyleTemplate, deleteStyleTemplate,
} from '../storage/styleTemplates'
import { IconBookmark, IconChevronDown, IconTrash, IconCheck } from '@tabler/icons-react'

/**
 * Save-as-template / apply-template control, shared by the Symbology UI
 * (kind='style') and the KML export settings form (kind='kml').
 *
 * `extract(currentData)` pulls the templatable subset out of whatever the
 * caller is currently editing (a layer's style, or kmlExportSettings).
 * `onApply(templateData)` merges a saved template's data back in — the
 * caller decides how (updateLayerStyle / setKmlExportSettings).
 */
export default function TemplateControls({ kind, currentData, onApply, label = 'Template' }) {
  const { addToast } = useAppStore()
  const [templates, setTemplates] = useState(() => listStyleTemplates().filter((t) => t.kind === kind))
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSaving(false) } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const refresh = () => setTemplates(listStyleTemplates().filter((t) => t.kind === kind))

  const handleSave = () => {
    if (!name.trim()) return
    saveStyleTemplate(name, kind, currentData)
    setName('')
    setSaving(false)
    refresh()
    addToast({ type: 'success', message: `Template "${name.trim()}" saved` })
  }

  const handleApply = (template) => {
    onApply(template.data)
    setOpen(false)
    addToast({ type: 'success', message: `Applied "${template.name}"` })
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    deleteStyleTemplate(id)
    refresh()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        onClick={() => setOpen((o) => !o)}
        style={{ gap: 4 }}
      >
        <IconBookmark size={12} /> {label} <IconChevronDown size={10} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          minWidth: 220,
          maxWidth: 280,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 2100,
          overflow: 'hidden',
        }}>
          {/* Save current as template */}
          {saving ? (
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                autoFocus
                className="input input-sm"
                placeholder="Template name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') setSaving(false)
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary btn-xs" style={{ flex: 1 }} onClick={handleSave} disabled={!name.trim()}>
                  <IconCheck size={12} /> Save
                </button>
                <button className="btn btn-ghost btn-xs" onClick={() => setSaving(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              onClick={() => setSaving(true)}
            >
              <IconBookmark size={13} style={{ opacity: 0.7 }} /> Save current as template…
            </button>
          )}

          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          {/* Saved templates */}
          {templates.length === 0 ? (
            <div style={{ padding: '10px', fontSize: 11, color: 'var(--text-muted)' }}>
              No saved templates yet
            </div>
          ) : (
            <div style={{ maxHeight: 220, overflow: 'auto' }}>
              {templates.map((t) => (
                <div
                  key={t.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  onClick={() => handleApply(t)}
                >
                  <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </span>
                  <button
                    className="btn btn-icon btn-ghost btn-xs"
                    data-tooltip="Delete template"
                    onClick={(e) => handleDelete(e, t.id)}
                  >
                    <IconTrash size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
