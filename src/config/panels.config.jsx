// panels.config — the floating panel registry.
//
// To add a panel:
//   1. Create a component in src/panels/ that renders its content inside
//      <FloatingPanel panelKey="yourkey" ...> (copy NotesPanel.jsx as a starter).
//   2. Add an entry here. The panel then gets: a toggle button in the top bar
//      and sidebar, a keyboard shortcut (Cmd/Ctrl+1…9 by list order), z-order
//      management, and persisted position/size.
//
// Components are registered with lazy() so this registry stays free of
// circular imports (panels import the store, which imports this file) and
// each panel is code-split automatically.
//
/* eslint-disable react-refresh/only-export-components -- registry file, not a component */
// Fields:
//   key         unique id — must match the panelKey passed to <FloatingPanel>
//   title       tooltip / sidebar label
//   icon        toggle-button icon
//   component   lazy(() => import(...)) of the panel component
//   defaults    initial { open, x, y, w, h }
//   permission  optional permission string (see roles.config); omit = public
//   showToggle  set false to hide from the top bar / sidebar (still toggleable
//               programmatically, e.g. the keybindings panel via "?")

import { lazy } from 'react'
import { IconNotes, IconSettings, IconKeyboard } from '@tabler/icons-react'

const PANELS = [
  {
    key: 'notes',
    title: 'Notes',
    icon: <IconNotes size={18} />,
    component: lazy(() => import('../panels/NotesPanel')),
    defaults: { open: false, x: 40, y: 40, w: 320, h: 380 },
    permission: 'panels.notes',
    showToggle: true,
  },
  {
    key: 'settings',
    title: 'Settings',
    icon: <IconSettings size={18} />,
    component: lazy(() => import('../panels/SettingsPanel')),
    defaults: { open: false, x: 120, y: 60, w: 320, h: 400 },
    showToggle: true,
  },
  {
    key: 'keybindings',
    title: 'Keyboard Shortcuts',
    icon: <IconKeyboard size={18} />,
    component: lazy(() => import('../panels/KeybindingsPanel')),
    defaults: { open: false, x: 200, y: 50, w: 340, h: 460 },
    showToggle: false,
  },
]

/** Initial panel layout state derived from the registry. */
export const DEFAULT_PANELS = Object.fromEntries(
  PANELS.map((p) => [p.key, { ...p.defaults }])
)

export default PANELS
