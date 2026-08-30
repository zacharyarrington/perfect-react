import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore from './useAppStore'
import { DEFAULT_PANELS, isDockable } from '../config/panels.config'

// Reset the store to its registry-derived defaults before every test so
// dock/panel state never leaks across assertions.
beforeEach(() => {
  useAppStore.setState({
    panels: DEFAULT_PANELS,
    panelZOrder: Object.keys(DEFAULT_PANELS),
    dock: { open: false, activeKey: null, width: 340 },
  })
})

describe('dockPanel', () => {
  it('docks a fresh panel: sets docked, open, and a dockOrder; opens the dock; sets activeKey', () => {
    useAppStore.getState().dockPanel('notes')
    const { panels, dock } = useAppStore.getState()
    expect(panels.notes.docked).toBe(true)
    expect(panels.notes.open).toBe(true)
    expect(dock.open).toBe(true)
    expect(dock.activeKey).toBe('notes')
  })

  it('does not change dockOrder when re-docking an already-docked panel', () => {
    useAppStore.getState().dockPanel('notes')
    const orderAfterFirstDock = useAppStore.getState().panels.notes.dockOrder
    useAppStore.getState().dockPanel('notes')
    expect(useAppStore.getState().panels.notes.dockOrder).toBe(orderAfterFirstDock)
  })

  it('assigns increasing dockOrder across multiple docked panels', () => {
    useAppStore.getState().dockPanel('notes')
    useAppStore.getState().dockPanel('settings')
    const { panels } = useAppStore.getState()
    expect(panels.settings.dockOrder).toBeGreaterThan(panels.notes.dockOrder)
  })

  it('leaves x/y/w/h untouched so a later undock restores the same floating rect', () => {
    useAppStore.setState((s) => ({
      panels: { ...s.panels, notes: { ...s.panels.notes, x: 42, y: 84, w: 320, h: 380 } },
    }))
    useAppStore.getState().dockPanel('notes')
    const { x, y, w, h } = useAppStore.getState().panels.notes
    expect({ x, y, w, h }).toEqual({ x: 42, y: 84, w: 320, h: 380 })
  })
})

describe('undockPanel', () => {
  it('clears docked and brings the panel to front in panelZOrder', () => {
    useAppStore.getState().dockPanel('notes')
    useAppStore.getState().undockPanel('notes')
    const { panels, panelZOrder } = useAppStore.getState()
    expect(panels.notes.docked).toBe(false)
    expect(panelZOrder[panelZOrder.length - 1]).toBe('notes')
  })

  it('advances dock.activeKey to the next docked tab when undocking the active tab', () => {
    useAppStore.getState().dockPanel('notes')
    useAppStore.getState().dockPanel('settings') // settings docked last, so it's active
    useAppStore.getState().undockPanel('settings')
    expect(useAppStore.getState().dock.activeKey).toBe('notes')
  })

  it('sets activeKey to null when undocking the last remaining docked panel', () => {
    useAppStore.getState().dockPanel('notes')
    useAppStore.getState().undockPanel('notes')
    expect(useAppStore.getState().dock.activeKey).toBeNull()
  })

  it('leaves activeKey unchanged when undocking a non-active docked tab', () => {
    useAppStore.getState().dockPanel('notes')
    useAppStore.getState().dockPanel('settings') // settings is now active
    useAppStore.getState().undockPanel('notes')
    expect(useAppStore.getState().dock.activeKey).toBe('settings')
  })
})

describe('closeDockedPanel', () => {
  it('sets open:false but keeps docked:true', () => {
    useAppStore.getState().dockPanel('notes')
    useAppStore.getState().closeDockedPanel('notes')
    const panel = useAppStore.getState().panels.notes
    expect(panel.open).toBe(false)
    expect(panel.docked).toBe(true)
  })

  it('advances activeKey the same way undockPanel does', () => {
    useAppStore.getState().dockPanel('notes')
    useAppStore.getState().dockPanel('settings')
    useAppStore.getState().closeDockedPanel('settings')
    expect(useAppStore.getState().dock.activeKey).toBe('notes')
  })
})

describe('reorderDockTabs', () => {
  function dockThree() {
    useAppStore.getState().dockPanel('layers')
    useAppStore.getState().dockPanel('layouts')
    useAppStore.getState().dockPanel('notes')
  }

  function orderedDockedKeys() {
    const { panels } = useAppStore.getState()
    return Object.entries(panels)
      .filter(([, p]) => p.docked)
      .sort(([, a], [, b]) => a.dockOrder - b.dockOrder)
      .map(([k]) => k)
  }

  it('moves the first tab to the last position', () => {
    dockThree()
    useAppStore.getState().reorderDockTabs('layers', 'notes')
    expect(orderedDockedKeys()).toEqual(['layouts', 'notes', 'layers'])
  })

  it('moves the last tab to the first position', () => {
    dockThree()
    useAppStore.getState().reorderDockTabs('notes', 'layers')
    expect(orderedDockedKeys()).toEqual(['notes', 'layers', 'layouts'])
  })

  it('swaps two middle-adjacent tabs', () => {
    dockThree()
    useAppStore.getState().reorderDockTabs('layouts', 'layers')
    expect(orderedDockedKeys()).toEqual(['layouts', 'layers', 'notes'])
  })

  it('no-ops on an unknown key', () => {
    dockThree()
    const before = orderedDockedKeys()
    useAppStore.getState().reorderDockTabs('layers', 'nonexistent-key')
    expect(orderedDockedKeys()).toEqual(before)
  })

  it('no-ops when from === to', () => {
    dockThree()
    const before = orderedDockedKeys()
    useAppStore.getState().reorderDockTabs('layers', 'layers')
    expect(orderedDockedKeys()).toEqual(before)
  })
})

describe('activatePanel', () => {
  it('docked branch: never toggles closed — calling it twice keeps open:true', () => {
    useAppStore.getState().dockPanel('notes')
    useAppStore.getState().activatePanel('notes')
    useAppStore.getState().activatePanel('notes')
    expect(useAppStore.getState().panels.notes.open).toBe(true)
  })

  it('docked branch: brings the dock to front (opens it, activates this tab)', () => {
    useAppStore.getState().dockPanel('notes')
    useAppStore.getState().dockPanel('settings')
    useAppStore.getState().toggleDock() // collapse it
    useAppStore.getState().activatePanel('notes')
    const { dock } = useAppStore.getState()
    expect(dock.open).toBe(true)
    expect(dock.activeKey).toBe('notes')
  })

  it('floating branch: defers to togglePanel open<->closed semantics', () => {
    expect(useAppStore.getState().panels.notes.open).toBe(false)
    useAppStore.getState().activatePanel('notes')
    expect(useAppStore.getState().panels.notes.open).toBe(true)
    useAppStore.getState().activatePanel('notes')
    expect(useAppStore.getState().panels.notes.open).toBe(false)
  })
})

describe('clampPanels', () => {
  it('skips docked panels (position unchanged)', () => {
    useAppStore.getState().dockPanel('notes')
    useAppStore.setState((s) => ({
      panels: { ...s.panels, notes: { ...s.panels.notes, x: 9999, y: 9999 } },
    }))
    useAppStore.getState().clampPanels(800, 600)
    const { x, y } = useAppStore.getState().panels.notes
    expect({ x, y }).toEqual({ x: 9999, y: 9999 })
  })

  it('clamps non-docked panels into the given bounds', () => {
    useAppStore.setState((s) => ({
      panels: { ...s.panels, notes: { ...s.panels.notes, x: 9999, y: 9999, w: 300, h: 400 } },
    }))
    useAppStore.getState().clampPanels(800, 600)
    const { x, y } = useAppStore.getState().panels.notes
    expect(x).toBeLessThanOrEqual(800)
    expect(y).toBeLessThanOrEqual(600)
  })
})

describe('isDockable', () => {
  it('defaults to true for a panel key not in the registry', () => {
    expect(isDockable('some-key-that-does-not-exist')).toBe(true)
  })

  it('is true by default for every current registry entry (none currently opt out)', () => {
    Object.keys(DEFAULT_PANELS).forEach((key) => {
      expect(isDockable(key)).toBe(true)
    })
  })
})
