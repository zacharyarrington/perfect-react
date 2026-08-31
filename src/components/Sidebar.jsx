// Sidebar — docked navigation rail built from the page & panel registries.
// Collapses to an icon rail (Cmd/Ctrl+B or the top-bar toggle). Pages and
// panels the current role can't access are hidden automatically.

import { NavLink } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import useAuth from '../auth/useAuth'
import APP_CONFIG from '../config/app.config'
import PAGES from '../config/pages.config'
import PANELS from '../config/panels.config'
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from '@tabler/icons-react'

export default function Sidebar() {
  const { panels, activatePanel, sidebarCollapsed, toggleSidebar } = useAppStore()
  const { hasPermission } = useAuth()

  const visiblePages  = PAGES.filter((p) => p.showInNav && hasPermission(p.permission))
  const visiblePanels = PANELS.filter((p) => p.showToggle && hasPermission(p.permission))

  return (
    <nav className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-section">
        

    {sidebarCollapsed ? <button className="sidebar-item" data-tooltip="Expand sidebar" onClick={toggleSidebar}>
      {sidebarCollapsed ? <IconLayoutSidebarLeftExpand size={18} /> : <IconLayoutSidebarLeftCollapse size={18} />}
    </button>:null
    }

{!sidebarCollapsed && <div className="sidebar-section-label sidebar-w-button">Pages <button className='btn btn-icon topbar-sidebar-toggle' onClick={toggleSidebar}>
  {sidebarCollapsed ? <IconLayoutSidebarLeftExpand size={18} /> : <IconLayoutSidebarLeftCollapse size={18} />}
</button></div>}


        {visiblePages.map((page) => (
          <NavLink
            key={page.path}
            to={page.path}
            end={page.path === '/'}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
            data-tooltip={sidebarCollapsed ? page.title : undefined}
          >
            <span className="sidebar-item-icon">{page.icon}</span>
            {!sidebarCollapsed && <span className="sidebar-item-label">{page.title}</span>}
          </NavLink>
        ))}
      </div>

      {visiblePanels.length > 0 && (
        <div className="sidebar-section">
          {!sidebarCollapsed && <div className="sidebar-section-label">Panels</div>}
          {visiblePanels.map((panel) => (
            <button
              key={panel.key}
              className={`sidebar-item${panels[panel.key]?.open ? ' active' : ''}`}
              data-tooltip={sidebarCollapsed ? panel.title : undefined}
              onClick={() => activatePanel(panel.key)}
            >
              <span className="sidebar-item-icon">{panel.icon}</span>
              {!sidebarCollapsed && <span className="sidebar-item-label">{panel.title}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        {!sidebarCollapsed && (
          <span className="sidebar-version">v{APP_CONFIG.version}</span>
        )}
      </div>
    </nav>
  )
}
