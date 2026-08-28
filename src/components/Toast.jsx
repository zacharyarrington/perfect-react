import useAppStore from '../store/useAppStore'
import { IconCircleCheck, IconCircleX, IconInfoCircle, IconAlertTriangle, IconX } from '@tabler/icons-react'

const ICONS = {
  success: <IconCircleCheck size={16} />,
  error:   <IconCircleX size={16} />,
  info:    <IconInfoCircle size={16} />,
  warning: <IconAlertTriangle size={16} />,
}

export default function Toast() {
  const { toasts, removeToast } = useAppStore()

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type || 'info'}`}>
          <span className="toast-icon">{ICONS[toast.type] || <IconInfoCircle size={16} />}</span>
          <span className="toast-message">{toast.message}</span>
          {toast.action && (
            <button
              className="toast-action"
              onClick={() => { toast.action.onClick(); removeToast(toast.id) }}
            >
              {toast.action.label}
            </button>
          )}
          <button className="toast-close" onClick={() => removeToast(toast.id)}><IconX size={14} /></button>
        </div>
      ))}
    </div>
  )
}
