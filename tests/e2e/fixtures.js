import { test as base, expect } from '@playwright/test'

// Dismisses the first-run LoginDialog deterministically by creating a
// throwaway user, so every spec starts from a known, signed-in state instead
// of the guest-vs-signed-in branch nondeterminism a raw page load would hit.
//
// Playwright's default isolation (a fresh browser context per test, with no
// shared storageState) already means specs don't see each other's
// IndexedDB/localStorage — no explicit beforeEach storage-clear is needed.
async function createUserAndDismissLogin(page, username = 'e2e-tester') {
  await page.goto('/')
  const overlay = page.locator('.login-overlay')
  await expect(overlay).toBeVisible()

  // On a fresh profile the dialog opens straight into the create form; only
  // click "Add User" if it's showing the list view instead.
  const addUserBtn = page.locator('.login-overlay button', { hasText: 'Add User' })
  if (await addUserBtn.isVisible().catch(() => false)) {
    await addUserBtn.click()
  }

  // Real ellipsis character (…) in the placeholder, not three dots.
  await page.locator('.login-overlay input').first().fill(username)
  await page.locator('.login-overlay button', { hasText: 'Create User' }).click()

  await expect(overlay).toBeHidden()
}

export const test = base.extend({
  loggedInPage: async ({ page }, use) => {
    await createUserAndDismissLogin(page)
    await use(page)
  },
})

export { expect }
