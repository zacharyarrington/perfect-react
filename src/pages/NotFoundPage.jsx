import { Link } from 'react-router-dom'
import { IconError404 } from '@tabler/icons-react'

export default function NotFoundPage() {
  return (
    <div className="page">
      <div className="empty-state" style={{ height: '60vh' }}>
        <div className="empty-state-icon"><IconError404 size={48} /></div>
        <div className="empty-state-title">Page not found</div>
        <div className="empty-state-desc">That route isn&apos;t registered in pages.config.jsx.</div>
        <Link to="/" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          Back to Home
        </Link>
      </div>
    </div>
  )
}
