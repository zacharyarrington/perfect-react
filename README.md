# Admin Shell

A reusable React admin-dashboard template built around a **floating window system**, a **registry-driven page/panel architecture**, and **local user/role/permission management**. Clone it, rename it, and start building your tool — the shell (navigation, windows, theming, auth, persistence) is already done.

Extracted from the ReadyMapGo UI system: the glassmorphism design language, draggable/resizable panels, top-bar menu, and profile flow — with all GIS functionality removed.

## Stack

- **React 19 + Vite** — SPA, no server required
- **react-router-dom** — client-side routing
- **zustand** — app state (panels, theme, session)
- **react-draggable / react-resizable** — floating windows
- **localforage** — IndexedDB persistence (users, layouts, panel content)
- **@tabler/icons-react** — icons

```bash
npm install
npm run dev       # local dev
npm run build     # production build → dist/
npm run lint
```

Deployable as-is to Netlify (`netlify.toml` includes the SPA redirect) or any static host.

## First run

On first visit you're prompted to create a user — **the first user automatically becomes Administrator**. Users created after that (from the login dialog) get the `defaultRole` from `app.config`; admins can promote them on the **Users** page. Guest access is on by default (`allowGuest`) with the `viewer` role.

> ⚠️ Auth is a local, client-side stand-in (IndexedDB) meant for internal tools and prototypes — there are no passwords and anyone with the URL can create a user. To use real auth later, swap the implementations in `src/auth/userManager.js` (keep the signatures) — the rest of the app only talks to `useAuth()` and `userManager`.

## Where everything lives

```
src/
  config/
    app.config.jsx      ← name, logo, theme, guest access   (start here)
    pages.config.jsx    ← page registry (routes + sidebar nav)
    panels.config.jsx   ← floating panel registry
    roles.config.js     ← roles & permissions
  auth/                 ← userManager, useAuth, RequirePermission, LoginDialog
  components/           ← TopBar, Sidebar, UserBadge, Toast
  panels/               ← FloatingPanel + panel components
  pages/                ← page components
  store/                ← useAppStore (zustand), usePersistence
  styles/index.css      ← the whole design system (CSS variables)
```

## How to: add a page

1. Create `src/pages/MyPage.jsx` (copy `ExamplePage.jsx`).
2. Register it in `src/config/pages.config.jsx`:

```jsx
{
  path: '/my-page',
  title: 'My Page',
  icon: <IconStar size={18} />,
  component: lazy(() => import('../pages/MyPage')),
  permission: 'content.edit',   // optional — omit for public
  showInNav: true,
}
```

Routing, the sidebar link, permission gating, and the top-bar title all update automatically.

## How to: add a floating panel

1. Create `src/panels/MyPanel.jsx` (copy `NotesPanel.jsx`) — render your content inside `<FloatingPanel panelKey="mypanel" …>`.
2. Register it in `src/config/panels.config.jsx`:

```jsx
{
  key: 'mypanel',                 // must match panelKey
  title: 'My Panel',
  icon: <IconTool size={18} />,
  component: lazy(() => import('../panels/MyPanel')),
  defaults: { open: false, x: 60, y: 60, w: 320, h: 400 },
  permission: 'panels.mypanel',   // optional
  showToggle: true,
}
```

You get for free: toggle buttons in the top bar + sidebar, a `Cmd/Ctrl+1…9` shortcut (registry order), drag/resize/minimize, z-ordering, clamping to the viewport, and per-user persisted position/size.

## How to: roles & permissions

Permissions are plain strings. Define who gets what in `src/config/roles.config.js`:

```js
export const ROLES = {
  admin:  { label: 'Administrator', badge: 'badge-red',   permissions: ['*'] },
  editor: { label: 'Editor',        badge: 'badge-blue',  permissions: ['content.edit', 'panels.notes'] },
  viewer: { label: 'Viewer',        badge: 'badge-green', permissions: ['panels.notes'] },
}
```

Gate anything three ways:

```jsx
// 1. Pages/panels — add `permission:` to their registry entry (nav hides itself too)
// 2. Any UI block:
<RequirePermission permission="content.edit" fallback={null}>
  <DangerousButton />
</RequirePermission>
// 3. Imperatively:
const { hasPermission, isAdmin, user } = useAuth()
if (hasPermission('content.edit')) { … }
```

The **Users** page (admin-only) manages accounts and role assignment; it refuses to demote the last admin or delete yourself.

## Built-ins

- **Theme** — dark / light / auto (follows OS), cycled from the top bar or `T`. All colors are CSS variables in `styles/index.css`; retheme by editing `:root` / `html[data-theme="light"]`.
- **Sidebar** — nav from the page registry + panel toggles; collapses to an icon rail (`Cmd/Ctrl+B`); hidden on mobile (hamburger menu takes over).
- **Keyboard shortcuts** — `Cmd/Ctrl+1…9` panels, `Cmd/Ctrl+\`` toggle all, `Esc` close all, `Cmd/Ctrl+B` sidebar, `T` theme, `?` shortcut list.
- **Toasts** — `useAppStore.getState().addToast({ type: 'success'|'error'|'info'|'warning', message })`.
- **Persistence** — theme, sidebar state, and panel layout auto-save per user (guests get a shared slot) and restore on load.
- **UI Kit page** — a living gallery of every built-in control (buttons, forms, badges, tables, toasts, permission gates).

## Redeploy checklist for a new tool

1. `src/config/app.config.jsx` — name, tagline, logo, theme, guest policy
2. `index.html` — `<title>` + meta description; `public/favicon.svg`
3. `package.json` — `name`, `version`
4. `src/config/roles.config.js` — your roles/permissions
5. Replace `HomePage.jsx`, add your pages/panels to the registries
6. Delete `NotesPanel` / `ExamplePage` if you don't want the demos
