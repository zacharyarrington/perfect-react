// Modal + ConfirmDialog — reusable dialogs on the design-system modal styles.
//
//   <Modal open={open} onClose={...} title="Edit thing" footer={<buttons/>}>…</Modal>
//   <ConfirmDialog open={open} title="Delete?" message="…" danger
//                  onConfirm={...} onCancel={...} />

import { useEffect } from 'react'
import { IconX } from '@tabler/icons-react'

export default function Modal({ open, onClose, title, width = 480, footer, children }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width, maxWidth: 'calc(100vw - 32px)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open, title = 'Are you sure?', message, confirmLabel = 'Confirm',
  cancelLabel = 'Cancel', danger = false, onConfirm, onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width={400}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 'var(--text-sm)' }}>{message}</p>
    </Modal>
  )
}
