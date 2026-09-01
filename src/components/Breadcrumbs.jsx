// Breadcrumbs — top-bar "where am I" trail. Resolves the current route
// against the page registry using react-router's matchPath (not a plain
// string-equality find — a dynamic route like /dashboard/:dashboardId never
// string-equals location.pathname, which is what left TopBar's old title
// blank on that page), and appends one extra crumb when the matched route
// carries a resolvable name for its dynamic param (currently just
// dashboards; see DASHBOARD_ROUTE below for how to add another).
//
// matchPath is a plain function (not a hook like useMatch), so it can run
// inside a loop over the static PAGES registry without any rules-of-hooks
// concern — this is the reason it's used here instead of useMatch.

import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import PAGES from '../config/pages.config'
import useDashboardStore from '../dashboards/useDashboardStore'
import { IconChevronRight } from '@tabler/icons-react'

export default function Breadcrumbs() {
  const navigate = useNavigate()
  const location = useLocation()
  const dashboards = useDashboardStore((s) => s.dashboards)

  // Checked in registry order; the first pattern that matches wins, same
  // resolution order React Router's own <Routes> uses.
  let matched = null
  let params = null
  for (const page of PAGES) {
    const m = matchPath(page.path, location.pathname)
    if (m) { matched = page; params = m.params; break }
  }

  if (!matched) return null

  // matched.path is the raw route PATTERN (e.g. '/dashboard/:dashboardId'),
  // not a navigable URL — clicking it would literally send the browser to
  // that string with ":dashboardId" in it. A pattern with a param only
  // becomes clickable once stripped back to its static parent segment
  // (here, '/dashboard'), which is itself a real registry entry that knows
  // how to redirect to a resolved dashboard (see DashboardShell.jsx).
  const staticPath = matched.path.includes(':')
    ? matched.path.slice(0, matched.path.indexOf('/:'))
    : matched.path
  const crumbPath = matched.path === '*' || !staticPath ? null : staticPath

  const crumbs = [{ label: matched.title, path: crumbPath }]

  // Dashboard detail route: resolve :dashboardId to its name as a trailing
  // crumb — the one place today where the URL carries info the static page
  // title can't (which dashboard). Add another `if (params.xId)` block here
  // the same way if a future route needs the same treatment.
  if (params?.dashboardId) {
    const dashboard = dashboards.find((d) => d.id === params.dashboardId)
    if (dashboard) crumbs.push({ label: dashboard.name, path: null })
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} className="breadcrumb-item">
            {i > 0 && <IconChevronRight size={12} className="breadcrumb-sep" />}
            {crumb.path && !isLast ? (
              <button className="breadcrumb-link" onClick={() => navigate(crumb.path)}>
                {crumb.label}
              </button>
            ) : (
              <span className={isLast ? 'breadcrumb-current' : ''}>{crumb.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
