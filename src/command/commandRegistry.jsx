// commandRegistry — builds the flat list of commands the palette searches:
// pages, panel toggles, and app-level actions. To add a custom action from
// anywhere in the app, extend EXTRA_ACTIONS or push into it at runtime via
// registerCommand (e.g. a page-specific "Export this report" command).

import PAGES from '../config/pages.config'
import PANELS from '../config/panels.config'
import {
  IconRoute, IconLayoutBoard, IconSun, IconMoon, IconSunMoon,
  IconLayoutSidebarLeftCollapse, IconLogout, IconUsers,
} from '@tabler/icons-react'

// Runtime-registered commands (cleared on hot reload, which is fine —
// pages re-register their commands as they mount).
let extraCommands = []

export function registerCommand(command) {
  extraCommands = [...extraCommands.filter((c) => c.id !== command.id), command]
  return () => { extraCommands = extraCommands.filter((c) => c.id !== command.id) }
}

/**
 * Builds the full command list for the given context. Pure function of
 * inputs so the palette can recompute on every keystroke without stale data.
 */
export function buildCommands({ hasPermission, navigate, store, signOut }) {
  const commands = []

  for (const page of PAGES) {
    if (!page.showInNav || !hasPermission(page.permission)) continue
    commands.push({
      id: `page:${page.path}`,
      section: 'Pages',
      icon: page.icon || <IconRoute size={16} />,
      label: page.title,
      hint: page.path,
      run: () => navigate(page.path),
    })
  }

  for (const panel of PANELS) {
    if (!hasPermission(panel.permission)) continue
    const isOpen = store.panels[panel.key]?.open
    commands.push({
      id: `panel:${panel.key}`,
      section: 'Panels',
      icon: panel.icon || <IconLayoutBoard size={16} />,
      label: `${isOpen ? 'Close' : 'Open'} ${panel.title}`,
      run: () => store.togglePanel(panel.key),
    })
  }

  commands.push(
    {
      id: 'action:theme-light',
      section: 'Actions',
      icon: <IconSun size={16} />,
      label: 'Switch to light theme',
      run: () => store.setTheme('light'),
    },
    {
      id: 'action:theme-dark',
      section: 'Actions',
      icon: <IconMoon size={16} />,
      label: 'Switch to dark theme',
      run: () => store.setTheme('dark'),
    },
    {
      id: 'action:theme-auto',
      section: 'Actions',
      icon: <IconSunMoon size={16} />,
      label: 'Switch to auto theme',
      run: () => store.setTheme('auto'),
    },
    {
      id: 'action:sidebar',
      section: 'Actions',
      icon: <IconLayoutSidebarLeftCollapse size={16} />,
      label: store.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar',
      run: () => store.toggleSidebar(),
    },
  )

  if (hasPermission('users.manage')) {
    commands.push({
      id: 'action:manage-users',
      section: 'Actions',
      icon: <IconUsers size={16} />,
      label: 'Manage users',
      run: () => navigate('/users'),
    })
  }

  commands.push({
    id: 'action:sign-out',
    section: 'Actions',
    icon: <IconLogout size={16} />,
    label: 'Sign out',
    run: signOut,
  })

  return [...commands, ...extraCommands]
}
