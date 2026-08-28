// HomePage — landing page. Replace this with your tool's main view.

import useAuth from '../auth/useAuth'
import APP_CONFIG from '../config/app.config'
import {
  IconRoute, IconAppWindow, IconShieldLock, IconPalette,
} from '@tabler/icons-react'

const FEATURES = [
  {
    icon: <IconRoute size={22} />,
    title: 'Pages & routing',
    desc: 'Add a component to src/pages/ and one entry to config/pages.config.jsx — routing and sidebar nav update automatically.',
  },
  {
    icon: <IconAppWindow size={22} />,
    title: 'Floating panels',
    desc: 'Draggable, resizable, minimizable windows with z-ordering and persisted layout. Register new ones in config/panels.config.jsx.',
  },
  {
    icon: <IconShieldLock size={22} />,
    title: 'Users, roles & permissions',
    desc: 'Local user accounts with role-based permissions. Gate pages, panels, or any UI with <RequirePermission>.',
  },
  {
    icon: <IconPalette size={22} />,
    title: 'Design system',
    desc: 'Dark/light glassmorphism theme driven by CSS variables. Buttons, forms, tables, badges, toasts, modals — see the UI Kit page.',
  },
]

export default function HomePage() {
  const { user, roleLabel } = useAuth()

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          Welcome{user ? `, ${user.username}` : ''} 👋
        </h1>
        <p className="page-subtitle">
          {APP_CONFIG.name} — {APP_CONFIG.tagline}. You are signed in as <strong>{roleLabel}</strong>.
        </p>
      </div>

      <div className="card-grid">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <div className="card-icon">{f.icon}</div>
            <div className="card-title">{f.title}</div>
            <div className="card-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="card-title">Make it yours</div>
        <div className="card-desc">
          Start in <code>src/config/app.config.jsx</code> (name, logo, theme, guest access), then
          replace this page in <code>src/pages/HomePage.jsx</code>. The full checklist lives in the README.
        </div>
      </div>
    </div>
  )
}
