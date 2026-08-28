import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useUser } from '@clerk/clerk-react'
import { IconHeart, IconX } from '@tabler/icons-react'
import useAppStore from '../store/useAppStore'

// Test-mode price IDs — swap for live prices before accepting real payments.
const ONE_TIME_PRICE_ID  = 'price_1TyUxDGxlWtdfAuQUHEEX1DO'
const MONTHLY_PRICE_ID   = 'price_1TyUxDGxlWtdfAuQcKotgUF1'

export default function DonateDialog({ onClose }) {
  const { user } = useUser()
  const { addToast } = useAppStore()
  const [busy, setBusy] = useState(null) // 'once' | 'monthly' | null

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const donate = async (kind) => {
    setBusy(kind)
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: kind === 'once' ? ONE_TIME_PRICE_ID : MONTHLY_PRICE_ID,
          mode: kind === 'once' ? 'payment' : 'subscription',
          purpose: 'donation',
          clerkUserId: user?.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      window.location.href = data.url
    } catch (err) {
      addToast({ type: 'error', message: `Donation failed: ${err.message}` })
      setBusy(null)
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(420px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="topbar-logo-icon" style={{ width: 36, height: 36 }}>
              <IconHeart size={18} />
            </div>
            <div className="modal-title" style={{ fontSize: 'var(--text-lg)' }}>Support ReadyMapGo</div>
          </div>
          <button className="login-close-btn" onClick={onClose} aria-label="Close donate dialog">
            <IconX size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
          <p className="empty-state-desc" style={{ margin: 0 }}>
            ReadyMapGo's core stays free. If it's been useful to you, a small
            donation helps keep it that way.
          </p>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={busy !== null}
            onClick={() => donate('once')}
          >
            {busy === 'once' ? 'Redirecting…' : 'Give $2 once'}
          </button>

          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={busy !== null}
            onClick={() => donate('monthly')}
          >
            {busy === 'monthly' ? 'Redirecting…' : 'Give $2 / month'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
