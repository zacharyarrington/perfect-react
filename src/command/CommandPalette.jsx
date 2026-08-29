// CommandPalette — Cmd/Ctrl+K fuzzy-searchable menu over pages, panels, and
// actions (see commandRegistry.jsx). Mounted once in App.jsx; opens itself on
// the keyboard shortcut, so no other wiring is needed.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import useAuth from '../auth/useAuth'
import { buildCommands } from './commandRegistry'
import { IconSearch, IconCornerDownLeft } from '@tabler/icons-react'

/** Simple subsequence fuzzy match — scores lower (better) for tighter, earlier matches. */
function fuzzyScore(query, text) {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (!q) return 0
  let qi = 0
  let score = 0
  let lastMatch = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += ti - lastMatch - 1  // gap penalty
      lastMatch = ti
      qi++
    }
  }
  if (qi < q.length) return null // not all query chars matched
  return score + lastMatch * 0.1 // slight preference for earlier overall match
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { hasPermission, signOut } = useAuth()
  const store = useAppStore()

  // Global shortcut: Cmd/Ctrl+K opens; Escape closes
  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const allCommands = useMemo(
    () => buildCommands({ hasPermission, navigate, store, signOut }),
    [hasPermission, navigate, store, signOut]
  )

  const results = useMemo(() => {
    if (!query.trim()) return allCommands
    return allCommands
      .map((c) => ({ c, score: fuzzyScore(query, `${c.label} ${c.section}`) }))
      .filter((r) => r.score !== null)
      .sort((a, b) => a.score - b.score)
      .map((r) => r.c)
  }, [allCommands, query])

  useEffect(() => setActiveIndex(0), [query])

  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const runCommand = (cmd) => {
    setOpen(false)
    cmd.run()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[activeIndex]) runCommand(results[activeIndex]) }
  }

  if (!open) return null

  // Group results by section, preserving relative order
  const sections = []
  for (const cmd of results) {
    let section = sections.find((s) => s.name === cmd.section)
    if (!section) { section = { name: cmd.section, items: [] }; sections.push(section) }
    section.items.push(cmd)
  }

  let flatIndex = -1

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <IconSearch size={16} className="cmdk-search-icon" />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Search pages, panels, actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="kbd">Esc</kbd>
        </div>

        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <div className="empty-state-title" style={{ fontSize: 'var(--text-sm)' }}>No matches</div>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.name}>
                <div className="cmdk-section-label">{section.name}</div>
                {section.items.map((cmd) => {
                  flatIndex++
                  const idx = flatIndex
                  return (
                    <button
                      key={cmd.id}
                      className={`cmdk-item${idx === activeIndex ? ' active' : ''}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => runCommand(cmd)}
                    >
                      <span className="cmdk-item-icon">{cmd.icon}</span>
                      <span className="cmdk-item-label">{cmd.label}</span>
                      {cmd.hint && <span className="cmdk-item-hint">{cmd.hint}</span>}
                      {idx === activeIndex && <IconCornerDownLeft size={13} className="cmdk-item-enter" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
