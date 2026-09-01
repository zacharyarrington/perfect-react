// auditStore — persistent audit/activity log: a permanent "who did what, when"
// record, distinct from both toasts (ephemeral) and notifications (dismissable
// bell feed). Entries are never auto-removed except by the MAX_STORED cap or
// an explicit clear from the Audit Log page.
//
//   import { logAction } from '../audit/auditStore'
//   logAction({ action: 'user.created', target: user.username })
//
// `userId`/`username` are stamped automatically from the active user at call
// time (or 'guest' / null when signed out) — callers never pass identity.

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import localforage from 'localforage'
import { getActiveUserId, getActiveUser } from '../auth/userManager'

const STORAGE_KEY = 'appshell_audit_log'
const MAX_STORED = 500

const useAuditStore = create(
  subscribeWithSelector((set, get) => ({
    entries: [],   // [{ id, ts, userId, username, action, target, meta }], newest first
    loaded: false,

    load: async () => {
      const stored = await localforage.getItem(STORAGE_KEY)
      set({ entries: stored || [], loaded: true })
    },

    log: ({ action, target = null, meta = null, username = null }) => {
      const entry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ts: new Date().toISOString(),
        userId: getActiveUserId(),
        username: username || 'guest',
        action, target, meta,
      }
      const entries = [entry, ...get().entries].slice(0, MAX_STORED)
      set({ entries })
      localforage.setItem(STORAGE_KEY, entries).catch(() => {})
      return entry.id
    },

    clear: () => {
      set({ entries: [] })
      localforage.setItem(STORAGE_KEY, []).catch(() => {})
    },
  }))
)

/**
 * Record an audit entry from anywhere — no hook needed. Looks up the current
 * username itself so call sites never have to thread it through.
 *
 *   logAction({ action: 'user.created', target: 'maria' })
 *   logAction({ action: 'role.changed', target: 'sam', meta: { from: 'viewer', to: 'admin' } })
 */
export function logAction({ action, target, meta }) {
  // Fire-and-forget: username lookup is async (localforage), but callers of
  // logAction are all sync UI handlers already doing their own await elsewhere
  // — this never blocks them.
  getActiveUser().then((user) => {
    useAuditStore.getState().log({ action, target, meta, username: user?.username || 'guest' })
  })
}

export default useAuditStore
