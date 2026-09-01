// NotesPanel — multiple rich-text notes per user (guests share one slot).
// Master-detail: a searchable, pinnable note list, and a full editor view
// for whichever note is open — always one view or the other, never
// side-by-side, so it stays usable at the panel's smallest resizable width
// (220px) instead of only working once someone happens to widen it.
//
// Storage: notesStore.js (localforage + a localStorage durability mirror,
// debounced autosave). This file owns only UI state (search query, confirm-
// delete target) and wires the panel's lifecycle (load on mount, flush on
// unmount/panel-close/pagehide) into that store.

import { useState, useEffect, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import useNotesStore, { deriveTitle } from './notesStore'
import FloatingPanel from './FloatingPanel'
import { RichTextEditor, SearchInput, ConfirmDialog, EmptyState } from '../components/ui'
import {
  IconNotes, IconPlus, IconTrash, IconPin, IconPinFilled,
  IconArrowLeft, IconNotebook,
} from '@tabler/icons-react'

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function NotesPanel() {
  const currentUser = useAppStore((s) => s.currentUser)
  const userKey = currentUser?.id || 'guest'

  const {
    notes, activeId, loaded, load, flush,
    createNote, updateNote, deleteNote, togglePin, setActiveId, sortedNotes,
  } = useNotesStore()

  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  // Kept current via its own effect (not mutated during render — refs are
  // for effects/handlers only) so the unmount-flush effect below always
  // flushes under whichever user was actually active, without needing
  // userKey itself as a dependency (which would flush-and-reload on every
  // user switch instead of only on real unmount).
  const userKeyRef = useRef(userKey)
  useEffect(() => { userKeyRef.current = userKey }, [userKey])

  useEffect(() => { load(userKey) }, [userKey, load])

  // Flush any pending debounced save on unmount (panel closed/popped-in-out
  // of dock/app navigated away) so an edit made right before closing isn't
  // silently lost to the debounce window — same rationale as every other
  // debounced-save pipeline in this app (see dashboardStorage.js).
  useEffect(() => {
    const flushIfHidden = () => { if (document.visibilityState === 'hidden') flush(userKeyRef.current) }
    window.addEventListener('pagehide', flushIfHidden)
    document.addEventListener('visibilitychange', flushIfHidden)
    return () => {
      flush(userKeyRef.current)
      window.removeEventListener('pagehide', flushIfHidden)
      document.removeEventListener('visibilitychange', flushIfHidden)
    }
  }, [flush])

  const activeNote = notes.find((n) => n.id === activeId) || null

  const visibleNotes = sortedNotes().filter((n) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return deriveTitle(n.content).toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
  })

  const handleCreate = () => createNote(userKey)
  const handleDelete = (id) => { deleteNote(id, userKey); setDeleteTarget(null) }

  if (!loaded) return null

  return (
    <FloatingPanel
      panelKey="notes"
      title="Notes"
      icon={<IconNotes size={16} />}
      defaultWidth={320}
      defaultHeight={380}
      minWidth={240}
    >
      <div className="notes-panel">
        {activeNote ? (
          <div className="notes-editor-view">
            <div className="notes-editor-toolbar">
              <button className="btn btn-icon btn-ghost btn-xs" onClick={() => setActiveId(null)} data-tooltip="Back to notes">
                <IconArrowLeft size={15} />
              </button>
              <input
                className="notes-title-input"
                value={activeNote.title ?? ''}
                placeholder={deriveTitle(activeNote.content)}
                onChange={(e) => updateNote(activeNote.id, { title: e.target.value }, userKey)}
              />
              <button
                className="btn btn-icon btn-ghost btn-xs"
                onClick={() => togglePin(activeNote.id, userKey)}
                data-tooltip={activeNote.pinned ? 'Unpin' : 'Pin'}
              >
                {activeNote.pinned ? <IconPinFilled size={14} /> : <IconPin size={14} />}
              </button>
              <button
                className="btn btn-icon btn-ghost btn-xs"
                onClick={() => setDeleteTarget(activeNote.id)}
                data-tooltip="Delete note"
              >
                <IconTrash size={14} />
              </button>
            </div>
            <div className="notes-editor-body">
              <RichTextEditor
                value={activeNote.content}
                onChange={(html) => updateNote(activeNote.id, { content: html }, userKey)}
                placeholder="Start writing…"
              />
            </div>
          </div>
        ) : (
          <div className="notes-list-view">
            <div className="notes-list-toolbar">
              <SearchInput value={query} onChange={setQuery} placeholder="Search notes…" />
              <button className="btn btn-icon btn-primary btn-sm" onClick={handleCreate} data-tooltip="New note">
                <IconPlus size={15} />
              </button>
            </div>

            {visibleNotes.length === 0 ? (
              <EmptyState
                icon={<IconNotebook size={26} />}
                title={notes.length === 0 ? 'No notes yet' : 'No matches'}
                desc={notes.length === 0 ? 'Create one to get started.' : `Nothing found for "${query}"`}
                action={notes.length === 0 && (
                  <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                    <IconPlus size={14} /> New note
                  </button>
                )}
              />
            ) : (
              <div className="notes-list">
                {visibleNotes.map((note) => (
                  <button key={note.id} className="notes-list-item" onClick={() => setActiveId(note.id)}>
                    <div className="notes-list-item-main">
                      <span className="notes-list-item-title">
                        {note.pinned && <IconPinFilled size={11} className="notes-pin-icon" />}
                        {note.title || deriveTitle(note.content)}
                      </span>
                      <span className="notes-list-item-time">{timeAgo(note.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete note?"
        message="This can't be undone."
        danger
        confirmLabel="Delete"
        onConfirm={() => handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </FloatingPanel>
  )
}
