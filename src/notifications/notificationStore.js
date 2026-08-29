// notificationStore — persistent notification feed, distinct from ephemeral
// toasts (useAppStore's addToast). A toast is "something just happened, and
// disappears in 4s"; a notification stays in the bell dropdown with
// read/unread state until dismissed, and survives a page refresh.
//
//   import { pushNotification } from '../notifications/notificationStore'
//   pushNotification({ title: 'Export finished', body: 'report.csv is ready', type: 'success' })

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import localforage from 'localforage'

const STORAGE_KEY = 'appshell_notifications'
const MAX_STORED = 100

const useNotificationStore = create(
  subscribeWithSelector((set, get) => ({
    notifications: [],   // [{ id, title, body, type, ts, read }], newest first
    loaded: false,

    load: async () => {
      const stored = await localforage.getItem(STORAGE_KEY)
      set({ notifications: stored || [], loaded: true })
    },

    push: ({ title, body, type = 'info' }) => {
      const notification = {
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title, body, type,
        ts: new Date().toISOString(),
        read: false,
      }
      const notifications = [notification, ...get().notifications].slice(0, MAX_STORED)
      set({ notifications })
      localforage.setItem(STORAGE_KEY, notifications).catch(() => {})
      return notification.id
    },

    markRead: (id) => {
      const notifications = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      set({ notifications })
      localforage.setItem(STORAGE_KEY, notifications).catch(() => {})
    },

    markAllRead: () => {
      const notifications = get().notifications.map((n) => ({ ...n, read: true }))
      set({ notifications })
      localforage.setItem(STORAGE_KEY, notifications).catch(() => {})
    },

    remove: (id) => {
      const notifications = get().notifications.filter((n) => n.id !== id)
      set({ notifications })
      localforage.setItem(STORAGE_KEY, notifications).catch(() => {})
    },

    clear: () => {
      set({ notifications: [] })
      localforage.setItem(STORAGE_KEY, []).catch(() => {})
    },
  }))
)

/** Push a notification from anywhere — no hook needed. */
export function pushNotification(notification) {
  return useNotificationStore.getState().push(notification)
}

export default useNotificationStore
