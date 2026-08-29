// NotificationBell — top-bar dropdown of persistent notifications, distinct
// from ephemeral toasts. Badge shows the unread count; dropdown lists newest
// first with per-item and mark-all-read actions.

import { useEffect, useRef, useState } from 'react'
import useNotificationStore from './notificationStore'
import {
  IconBell, IconCircleCheck, IconCircleX, IconInfoCircle, IconAlertTriangle,
  IconCheck, IconX, IconBellOff,
} from '@tabler/icons-react'

const ICONS = {
  success: <IconCircleCheck size={16} className="notif-icon success" />,
  error:   <IconCircleX size={16} className="notif-icon error" />,
  warning: <IconAlertTriangle size={16} className="notif-icon warning" />,
  info:    <IconInfoCircle size={16} className="notif-icon info" />,
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const { notifications, loaded, load, markRead, markAllRead, remove } = useNotificationStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => { if (!loaded) load() }, [loaded, load])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="notif-bell-wrapper" ref={ref}>
      <button
        className={`btn btn-icon${open ? ' active' : ''}`}
        data-tooltip="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <IconBell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="btn-link" style={{ fontSize: 'var(--text-xs)', padding: 0 }} onClick={markAllRead}>
                <IconCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6) var(--space-4)' }}>
              <div className="empty-state-icon"><IconBellOff size={26} /></div>
              <div className="empty-state-title" style={{ fontSize: 'var(--text-sm)' }}>No notifications</div>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item${n.read ? '' : ' unread'}`}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  {ICONS[n.type] || ICONS.info}
                  <div className="notif-item-body">
                    <div className="notif-item-title">{n.title}</div>
                    {n.body && <div className="notif-item-desc">{n.body}</div>}
                    <div className="notif-item-time">{timeAgo(n.ts)}</div>
                  </div>
                  <button
                    className="btn btn-icon btn-ghost btn-xs notif-item-remove"
                    onClick={(e) => { e.stopPropagation(); remove(n.id) }}
                    aria-label="Dismiss"
                  >
                    <IconX size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
