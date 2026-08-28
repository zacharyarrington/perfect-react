# Admin Shell

A reusable React admin-dashboard template built around a **floating window system**, a **registry-driven page/panel architecture**, and **local user/role/permission management** — plus opt-in modules: an embeddable **map component** (GeoJSON layers, legend, basemaps), **themed charts**, **shareable layout templates**, and a **UI component library**. Clone it, rename it, and start building your tool.

Extracted from the ReadyMapGo UI system: the glassmorphism design language, draggable/resizable panels, top-bar menu, and profile flow.

## Stack

- **React 19 + Vite** — SPA, no server required
- **react-router-dom** — client-side routing
- **zustand** — app state (panels, theme, session, map layers)
- **react-draggable / react-resizable** — floating windows
- **localforage** — IndexedDB persistence (users, layouts, panel content)
- **mapbox-gl** — map module (lazy-loaded; needs a free token)
- **recharts** — chart components (lazy-loaded)
- **@tabler/icons-react** — icons

```bash
npm install
cp .env.example .env   # add VITE_MAPBOX_TOKEN for the map module (optional)
npm run dev            # local dev
npm run build          # production build → dist/
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
  components/
    ui/                 ← Modal, Tabs, DataTable, StatCard, ProgressBar, … (barrel: components/ui)
    charts/             ← BarChart, LineChart, DonutChart (barrel: components/charts)
  map/                  ← MapView, useMapStore, LayersPanel, Legend, BasemapMenu
  layouts/              ← layout template manager + LayoutsPanel
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

## How to: use the map component

Set `VITE_MAPBOX_TOKEN` in `.env` (free at account.mapbox.com). Without it, map components render a setup card instead of breaking.

```jsx
import MapView from '../map/MapView'
import useMapStore from '../map/useMapStore'

// Full-bleed (see MapPage.jsx) or any sized container:
<div style={{ height: 400, borderRadius: 12, overflow: 'hidden' }}>
  <MapView />            {/* props: showLegend, showBasemapPicker, showControls, showCoords, interactive */}
</div>

// Layers from anywhere — every mounted MapView stays in sync:
useMapStore.getState().addLayer({ name: 'Sites', type: 'point', geojson, style: { color: '#00d4c8' } })
```

What's included: GeoJSON layers (simple/categorical/graduated symbology via `LayerRenderer.js`), hover popups, click-to-select highlighting, a collapsible legend, six Mapbox basemaps, and the **Map Layers** floating panel (import GeoJSON files, visibility, color, opacity, labels, reorder, zoom-to). Heavier GIS features (drawing, measuring, shapefile/CSV import, spatial ops) were left out deliberately — the original ReadyMapGo implementations are recoverable from the baseline commit if you need them.

## How to: layout templates (shareable workspaces)

Open the **Layouts** panel: arrange your panels, save the workspace under a name, and apply it any time. **Export** writes a `.layout.json` file you can send to anyone using the app — they **Import** it from the same panel. Templates capture panel positions/sizes/open-state, sidebar state, and theme. Built-ins (`Default`, `Minimal`) live in `src/layouts/layoutTemplates.js` — add your own presets there.

## How to: charts

```jsx
import { BarChart, LineChart, DonutChart } from '../components/charts'

<BarChart data={rows} xKey="month" stacked
  series={[{ key: 'signups', label: 'Signups' }, { key: 'churn', label: 'Churn' }]} />
```

Tooltips, legends (auto for ≥2 series), and theming are built in. Series colors come from `--chart-1…8` — a colorblind-validated palette with separate light/dark steps. The slot *order* is the accessibility mechanism: assign in order, don't shuffle, and prefer ≤4 series (DonutChart folds extras into "Other" automatically).

## Built-ins

- **Theme** — dark / light / auto (follows OS), cycled from the top bar or `T`. All colors are CSS variables in `styles/index.css`; retheme by editing `:root` / `html[data-theme="light"]`.
- **Sidebar** — nav from the page registry + panel toggles; collapses to an icon rail (`Cmd/Ctrl+B`); hidden on mobile (hamburger menu takes over).
- **Keyboard shortcuts** — `Cmd/Ctrl+1…9` panels, `Cmd/Ctrl+\`` toggle all, `Esc` close all, `Cmd/Ctrl+B` sidebar, `T` theme, `?` shortcut list.
- **Toasts** — `useAppStore.getState().addToast({ type: 'success'|'error'|'info'|'warning', message })`.
- **Persistence** — theme, sidebar state, and panel layout auto-save per user (guests get a shared slot) and restore on load.
- **UI component library** — `import { Modal, ConfirmDialog, Tabs, Collapsible, ProgressBar, SearchInput, DataTable, StatCard, PageHeader, EmptyState } from '../components/ui'`. DataTable is sortable/searchable/paginated.
- **UI Kit page** — a living gallery of everything above, organized in tabs (Basics / Components / Charts).
- **Dashboard page** — a full example wiring stat cards, charts, and a data table together.

## Redeploy checklist for a new tool

1. `src/config/app.config.jsx` — name, tagline, logo, theme, guest policy
2. `index.html` — `<title>` + meta description; `public/favicon.svg`
3. `package.json` — `name`, `version`
4. `src/config/roles.config.js` — your roles/permissions
5. Replace `HomePage.jsx`, add your pages/panels to the registries
6. Delete `NotesPanel` / `ExamplePage` if you don't want the demos
