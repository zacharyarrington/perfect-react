// app.config — global branding & behaviour for the shell.
// This is the first file to edit when starting a new tool from this template.

import { IconLayoutDashboard } from '@tabler/icons-react'

const APP_CONFIG = {
  // Shown in the top bar, login dialog, and browser tab
  name: 'Admin Shell',
  tagline: 'Reusable admin dashboard template',
  version: '0.1.0',

  // Icon element used for the logo (any @tabler/icons-react icon, or your own <img/>)
  logo: <IconLayoutDashboard size={22} />,

  // 'dark' | 'light' | 'auto'  (auto follows the OS preference)
  defaultTheme: 'light',

  // When true, visitors can use the app without creating a user.
  // Guests get the `guestRole` from roles.config permissions.
  allowGuest: true,
  guestRole: 'viewer',

  // Role assigned to users created from the login dialog after the first
  // user exists. The very first user is always promoted to admin.
  defaultRole: 'viewer',
}

export default APP_CONFIG
