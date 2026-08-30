import { test, expect } from './fixtures'

// Opens a panel from the sidebar (floating, since nothing is docked yet) and
// docks it via its header's "Dock" button — the standard path into the dock
// used across these specs.
async function openAndDock(page, panelTitle) {
  await page.locator('.sidebar-item', { hasText: panelTitle }).click()
  const header = page.locator('.floating-panel', { hasText: panelTitle }).locator('.panel-header')
  await header.locator('.panel-control-btn[title="Dock"]').click()
}

test.describe('panel docking', () => {
  test('docks a panel via its header button and shows it inside the dock rail', async ({ loggedInPage: page }) => {
    await openAndDock(page, 'Notes')

    await expect(page.locator('.dock-rail')).toBeVisible()
    await expect(page.locator('.dock-tab')).toHaveCount(1)
    await expect(page.locator('.dock-tab-name')).toHaveText('Notes')
    // Docked, so no floating chrome for this key anymore.
    await expect(page.locator('.floating-panel[data-panel-key="notes"]')).toHaveCount(0)
  })

  test('two docked panels: only the active tab\'s slot is visible', async ({ loggedInPage: page }) => {
    await openAndDock(page, 'Notes')
    await openAndDock(page, 'Settings')

    const slots = page.locator('.dock-slot')
    await expect(slots).toHaveCount(2)

    // Settings was docked last, so it starts active.
    const settingsSlot = page.locator('.dock-slot[data-panel-key="settings"]')
    const notesSlot = page.locator('.dock-slot[data-panel-key="notes"]')
    await expect(settingsSlot).toHaveCSS('display', 'flex')
    await expect(notesSlot).toHaveCSS('display', 'none')

    await page.locator('.dock-tab', { hasText: 'Notes' }).click()
    await expect(notesSlot).toHaveCSS('display', 'flex')
    await expect(settingsSlot).toHaveCSS('display', 'none')
  })

  test('closing a docked tab then reopening via the sidebar lands back in the dock, not floating', async ({ loggedInPage: page }) => {
    await openAndDock(page, 'Notes')
    await page.locator('.dock-tab', { hasText: 'Notes' }).locator('.dock-tab-close').click()

    await expect(page.locator('.dock-tab')).toHaveCount(0)

    // Reopen via the sidebar — this is the activatePanel routing path, which
    // must surface the dock rather than toggle a floating panel open.
    await page.locator('.sidebar-item', { hasText: 'Notes' }).click()

    await expect(page.locator('.dock-tab')).toHaveCount(1)
    await expect(page.locator('.floating-panel[data-panel-key="notes"]')).toHaveCount(0)
  })

  test('pop-out restores the panel as floating', async ({ loggedInPage: page }) => {
    await openAndDock(page, 'Notes')
    await page.locator('.dock-slot[data-panel-key="notes"] .panel-control-btn[title="Pop out"]').click()

    await expect(page.locator('.floating-panel[data-panel-key="notes"]')).toBeVisible()
    await expect(page.locator('.dock-tab')).toHaveCount(0)
  })

  test('Cmd/Ctrl+D collapses and expands the dock rail', async ({ loggedInPage: page }) => {
    await openAndDock(page, 'Notes')
    await expect(page.locator('.dock-rail')).toBeVisible()

    await page.keyboard.press('ControlOrMeta+d')
    await expect(page.locator('.dock-rail-collapsed')).toBeVisible()
    await expect(page.locator('.dock-rail')).toHaveCount(0)

    await page.keyboard.press('ControlOrMeta+d')
    await expect(page.locator('.dock-rail')).toBeVisible()
  })

  test('dock state survives a reload (guest persistence)', async ({ loggedInPage: page }) => {
    await openAndDock(page, 'Notes')
    await expect(page.locator('.dock-tab')).toHaveCount(1)

    // The panels save is debounced 1500ms — wait past it before reloading so
    // this actually verifies persisted state, not an in-memory fluke.
    await page.waitForTimeout(2000)
    await page.reload()

    await expect(page.locator('.dock-rail')).toBeVisible()
    await expect(page.locator('.dock-tab')).toHaveCount(1)
    await expect(page.locator('.floating-panel[data-panel-key="notes"]')).toHaveCount(0)
  })
})
