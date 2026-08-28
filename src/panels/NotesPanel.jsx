// NotesPanel — a working example panel: a scratchpad persisted to the browser.
// Copy this file as the starting point for new panels, then register the copy
// in config/panels.config.jsx.

import { useState, useEffect, useRef } from 'react'
import localforage from 'localforage'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import { IconNotes } from '@tabler/icons-react'

const NOTES_KEY = 'appshell_notes'

export default function NotesPanel() {
  const currentUser = useAppStore((s) => s.currentUser)
  const [text, setText] = useState('')
  const loaded = useRef(false)
  const saveTimer = useRef(null)

  // Notes are stored per-user (guests share one scratchpad)
  const storageKey = `${NOTES_KEY}_${currentUser?.id || 'guest'}`

  useEffect(() => {
    loaded.current = false
    localforage.getItem(storageKey).then((saved) => {
      setText(saved || '')
      loaded.current = true
    })
  }, [storageKey])

  // Debounced save
  useEffect(() => {
    if (!loaded.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localforage.setItem(storageKey, text).catch(() => {})
    }, 500)
    return () => clearTimeout(saveTimer.current)
  }, [text, storageKey])

  return (
    <FloatingPanel
      panelKey="notes"
      title="Notes"
      icon={<IconNotes size={16} />}
      defaultWidth={320}
      defaultHeight={380}
    >
      <textarea
        className="notes-textarea"
        placeholder="Scratchpad — notes are saved automatically on this device…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </FloatingPanel>
  )
}
