import { describe, expect, it } from 'vitest'
import { mergePanels } from './usePersistence'

describe('mergePanels', () => {
  it('returns current unchanged when there is nothing saved', () => {
    const current = { notes: { x: 1, y: 2, docked: false, dockOrder: 0 } }
    expect(mergePanels(current, null)).toBe(current)
  })

  it('regression: a saved blob missing docked/dockOrder keeps the fresh defaults for those fields while taking saved position/size', () => {
    // Simulates a pre-docking-feature saved blob: only x/y/w/h were ever
    // persisted for this key, so `saved.notes` has no docked/dockOrder.
    // The old code did `{ ...s.panels, ...saved }` — a whole-object replace
    // that would have silently produced `docked: undefined` here.
    const current = {
      notes: { x: 40, y: 40, w: 320, h: 380, docked: false, dockOrder: 3 },
    }
    const saved = {
      notes: { x: 999, y: 888, w: 500, h: 600 }, // no docked/dockOrder
    }
    const result = mergePanels(current, saved)

    // Saved position/size wins...
    expect(result.notes.x).toBe(999)
    expect(result.notes.y).toBe(888)
    expect(result.notes.w).toBe(500)
    expect(result.notes.h).toBe(600)
    // ...but the fresh per-key defaults for fields the saved blob never
    // had must survive, not be wiped by a blanket object-replace.
    expect(result.notes.docked).toBe(false)
    expect(result.notes.dockOrder).toBe(3)
  })

  it('a saved value for docked/dockOrder does override the default when present', () => {
    const current = { notes: { x: 1, y: 1, docked: false, dockOrder: 0 } }
    const saved = { notes: { docked: true, dockOrder: 5 } }
    const result = mergePanels(current, saved)
    expect(result.notes.docked).toBe(true)
    expect(result.notes.dockOrder).toBe(5)
  })

  it('a key present in current but absent from saved is left as-is', () => {
    const current = {
      notes: { x: 1, docked: false, dockOrder: 0 },
      settings: { x: 2, docked: false, dockOrder: 1 },
    }
    const saved = { notes: { x: 999 } } // settings never saved
    const result = mergePanels(current, saved)
    expect(result.settings).toEqual(current.settings)
  })
})
