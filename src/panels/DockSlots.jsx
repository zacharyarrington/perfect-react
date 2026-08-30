// DockSlots — a tiny external-store registry mapping a docked panel's key to
// the DOM node its content should portal into.
//
// Dock.jsx and FloatingPanel.jsx are unrelated branches under App.jsx (Dock
// lives next to the sidebar; a panel's FloatingPanel wrapper is mounted deep
// inside PanelHost), so there's no ref to prop-drill between them. A module-
// level registry is the simplest thing that works for "some other part of
// the tree needs this DOM node" without adding a context provider for a
// single narrow use.
import { useSyncExternalStore } from 'react'

const slots = new Map()
const listeners = new Set()

function emit() {
  for (const l of listeners) l()
}

/** Called by Dock.jsx (via a ref callback) as each docked tab's body mounts/unmounts. */
export function registerDockSlot(panelKey, el) {
  if (el) slots.set(panelKey, el)
  else slots.delete(panelKey)
  emit()
}

/** Returns the current slot element for a panel key, or null if the dock hasn't mounted it. */
export function useDockSlot(panelKey) {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => slots.get(panelKey) ?? null
  )
}
