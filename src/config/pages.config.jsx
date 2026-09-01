// pages.config — the page registry.
//
// To add a page:
//   1. Create a component in src/pages/ (copy ExamplePage.jsx as a starter).
//   2. Add an entry here. Done — routing and sidebar nav update automatically.
//
// Components are registered with lazy() so pages are code-split and this
// registry never forms circular imports with the pages themselves.
//
// Fields:
//   path        route path (react-router syntax; '/' is the landing page)
//   title       shown in the sidebar and top bar
//   icon        sidebar / nav icon
//   component   lazy(() => import(...)) of the page component
//   permission  optional permission string (see roles.config); omit = public
//   showInNav   set false to register the route without a sidebar link

import { lazy } from 'react'
import { IconHome, IconUsers, IconPalette, IconChartBar, IconMap, IconHistory } from '@tabler/icons-react'

const PAGES = [
  {
    path: '/',
    title: 'Home',
    icon: <IconHome size={18} />,
    component: lazy(() => import('../pages/HomePage')),
    showInNav: true,
  },
  {
    path: '/dashboard',
    title: 'Dashboards',
    icon: <IconChartBar size={18} />,
    component: lazy(() => import('../pages/DashboardPage')),
    showInNav: true,
  },
  {
    path: '/dashboard/:dashboardId',
    title: 'Dashboards',
    icon: <IconChartBar size={18} />,
    component: lazy(() => import('../pages/DashboardPage')),
    showInNav: false,
  },
  {
    path: '/map',
    title: 'Map',
    icon: <IconMap size={18} />,
    component: lazy(() => import('../pages/MapPage')),
    showInNav: true,
  },
  {
    path: '/ui-kit',
    title: 'UI Kit',
    icon: <IconPalette size={18} />,
    component: lazy(() => import('../pages/ExamplePage')),
    showInNav: true,
  },
  {
    path: '/users',
    title: 'Users',
    icon: <IconUsers size={18} />,
    component: lazy(() => import('../pages/UsersPage')),
    permission: 'users.manage',
    showInNav: true,
  },
  {
    path: '/audit-log',
    title: 'Audit Log',
    icon: <IconHistory size={18} />,
    component: lazy(() => import('../pages/AuditLogPage')),
    permission: 'audit.view',
    showInNav: true,
  }
]

export default PAGES
