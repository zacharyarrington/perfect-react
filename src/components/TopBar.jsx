// TopBar — app-wide header: sidebar toggle, branding, current page title,
// panel toggles (from the panel registry), theme cycle, and the user badge.

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import useAuth from '../auth/useAuth'
import APP_CONFIG from '../config/app.config'
import PAGES from '../config/pages.config'
import PANELS from '../config/panels.config'
import UserBadge from './UserBadge'
import {
  IconSun, IconMoon, IconSunMoon, IconMenu2, IconX,
  IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react'

export default function TopBar() {
  const {
    panels, togglePanel,
    theme, setTheme,
    sidebarCollapsed, toggleSidebar,
    isLoading, loadingMessage,
  } = useAppStore()
  const { hasPermission } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentPage = PAGES.find((p) => p.path === location.pathname)
  const visiblePanels = PANELS.filter((p) => p.showToggle && hasPermission(p.permission))
  const visiblePages  = PAGES.filter((p) => p.showInNav && hasPermission(p.permission))

  const themeTooltip = theme === 'auto' ? 'Theme: Auto (follows OS)' : theme === 'dark' ? 'Theme: Dark' : 'Theme: Light'
  const cycleTheme = () => setTheme(theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto')

  return (
    <>
      <header className="topbar">
        {/* Sidebar toggle */}
        <button
          className="btn btn-icon topbar-sidebar-toggle"
          data-tooltip={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? <IconLayoutSidebarLeftExpand size={18} /> : <IconLayoutSidebarLeftCollapse size={18} />}
        </button>

        {/* Logo */}
        <a className="topbar-logo" href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>
          <div className="topbar-logo-icon">{APP_CONFIG.logo}</div>
          <span className="topbar-logo-text">{APP_CONFIG.name}</span>
        </a>

        <div className="topbar-divider" />

        {/* Current page title */}
        <div className="topbar-actions">
          <span className="topbar-page-title">{currentPage?.title || ''}</span>
        </div>

        {/* Right side: panel toggles, theme, user */}
        <div className="topbar-right">
          {visiblePanels.map((p) => (
            <button
              key={p.key}
              id={`btn-panel-${p.key}`}
              className={`btn btn-icon${panels[p.key]?.open ? ' active' : ''}`}
              data-tooltip={p.title}
              onClick={() => togglePanel(p.key)}
            >
              {p.icon}
            </button>
          ))}

          <div className="topbar-divider" />

          <button
            className={`btn btn-icon${theme !== 'auto' ? ' active' : ''}`}
            data-tooltip={themeTooltip}
            onClick={cycleTheme}
          >
            {theme === 'light' ? <IconSun size={18} /> : theme === 'dark' ? <IconMoon size={18} /> : <IconSunMoon size={18} />}
          </button>

          <UserBadge />
        </div>

        {/* Hamburger – shown only on small screens */}
        <button
          className={`btn btn-icon topbar-hamburger${mobileMenuOpen ? ' active' : ''}`}
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="topbar-mobile-menu" onClick={() => setMobileMenuOpen(false)}>
          <div className="topbar-mobile-panels" onClick={(e) => e.stopPropagation()}>
            {visiblePages.map((p) => (
              <button
                key={p.path}
                className={`btn btn-ghost topbar-mobile-panel-btn${location.pathname === p.path ? ' active' : ''}`}
                onClick={() => { navigate(p.path); setMobileMenuOpen(false) }}
              >
                <span className="topbar-mobile-panel-icon">{p.icon}</span>
                <span className="topbar-mobile-panel-label">{p.title}</span>
              </button>
            ))}
            {visiblePanels.map((p) => (
              <button
                key={p.key}
                className={`btn btn-ghost topbar-mobile-panel-btn${panels[p.key]?.open ? ' active' : ''}`}
                onClick={() => { togglePanel(p.key); setMobileMenuOpen(false) }}
              >
                <span className="topbar-mobile-panel-icon">{p.icon}</span>
                <span className="topbar-mobile-panel-label">{p.title}</span>
              </button>
            ))}
          </div>
          <div className="topbar-mobile-actions" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost" onClick={cycleTheme}>
              {theme === 'light' ? <IconSun size={16} /> : theme === 'dark' ? <IconMoon size={16} /> : <IconSunMoon size={16} />}
              <span>Theme</span>
            </button>
            <UserBadge />
          </div>
        </div>
      )}

      {/* Loading bar */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 'var(--topbar-height)',
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
          zIndex: 'var(--z-topbar)',
        }}>
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 14px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}>
            <span className="spinner" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
            {loadingMessage || 'Loading…'}
          </div>
        </div>
      )}
    </>
  )
}
