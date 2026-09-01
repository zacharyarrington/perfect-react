# Admin Shell

A reusable React admin-dashboard template built around a **floating/dockable window system**, a **registry-driven page/panel architecture**, a **no-code dashboard & widget builder**, and **local user/role/permission management** — plus opt-in modules: an embeddable **map component** (GeoJSON layers, legend, basemaps), **themed charts**, **shareable layout templates**, and a **UI component library**. Clone it, rename it, and start building your tool.

Extracted from the ReadyMapGo UI system: the glassmorphism design language, draggable/resizable panels, top-bar menu, and profile flow.

## Stack

- **React 19 + Vite** — SPA, no server required
- **react-router-dom** — client-side routing
- **zustand** — app state (panels, dock, dashboards, theme, session, map layers)
- **react-draggable / react-resizable** — floating windows
- **react-grid-layout** — dashboard widget grid
- **localforage** — IndexedDB persistence (users, layouts, dashboards, panel content)
- **mapbox-gl** — map module (lazy-loaded; needs a free token)
- **recharts** — chart components (lazy-loaded)
- **papaparse** — CSV import for data sources
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

> ⚠️ Auth is a local, client-side stand-in (IndexedDB) meant for internal tools and prototypes — there are no passwords and anyone with the URL can create a user. See "How to: wire up a real backend for users & roles" below when you're ready to move off it — it's a genuine swap-in, not a rewrite.

## Where everything lives

```
src/
  config/
    app.config.jsx      ← name, logo, theme, guest access   (start here)
    pages.config.jsx    ← page registry (routes + sidebar nav)
    panels.config.jsx   ← floating panel registry
    roles.config.js     ← default roles & permissions (seed values for a fresh install)
    rolesStore.js       ← runtime-editable roles (localforage overlay on roles.config.js)
  auth/                 ← userManager, useAuth, RequirePermission, LoginDialog
  components/
    ui/                 ← Modal, Tabs, DataTable, StatCard, ProgressBar, … (barrel: components/ui)
    charts/             ← BarChart, LineChart, DonutChart (barrel: components/charts)
  map/                  ← MapView, useMapStore, LayersPanel, Legend, BasemapMenu
  layouts/              ← layout template manager + LayoutsPanel
  dashboards/           ← multi-dashboard shell, tabs, widget grid, save/export templates
  widgets/              ← widget type registry, config forms, Stat/Chart/Table/Text renderers
  dataSources/          ← data provider registry (mock, CSV import), Data Sources panel
  command/              ← command palette (Cmd/Ctrl+K) + its command registry
  notifications/        ← persistent notification store + NotificationBell
  audit/                ← persistent audit/activity log store
  components/forms/     ← useForm, Field, validators (barrel: components/forms)
  panels/               ← FloatingPanel, PanelChrome, Dock (docking rail), panel components
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

Every panel is dockable by default. A "Dock" button in its header moves it into a tabbed rail on the right (`Cmd/Ctrl+D` to collapse/expand the rail) — it shares that space with any other docked panels via a tab strip, and "pop out" moves it back to floating at its last position/size. Set `dockable: false` on a registry entry to opt a panel out of docking entirely (e.g. one that only makes sense as a floating overlay). Docking is a desktop affordance — panels always render as floating bottom sheets below the mobile breakpoint, regardless of their docked state.

## How to: roles & permissions

Permissions are plain strings. `src/config/roles.config.js` defines the **default** roles a fresh install ships with:

```js
export const DEFAULT_ROLES = {
  admin:  { label: 'Administrator', badge: 'badge-red',   permissions: ['*'] },
  editor: { label: 'Editor',        badge: 'badge-blue',  permissions: ['content.edit', 'panels.notes'] },
  viewer: { label: 'Viewer',        badge: 'badge-green', permissions: ['panels.notes'] },
}
```

That file is seed data, not the live source of truth — **`src/config/rolesStore.js`** is: a localforage-backed store that starts from `DEFAULT_ROLES` and overlays any roles created/edited/deleted at runtime through the **Roles editor** on the **Users** page (admin-only, next to user management). Create a role, name it, pick a badge color, and check off which permissions it grants from an auto-discovered checklist — every `permission:` string declared on a `pages.config.jsx`/`panels.config.jsx` entry shows up there automatically (add a string to `EXTRA_PERMISSIONS` in `roles.config.js` if you gate something with `<RequirePermission>` that isn't tied to a registry entry). The built-in `admin` role can't be deleted (there must always be a way back in); any role still assigned to a user can't be deleted until it's reassigned.

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

All three read live from `rolesStore.js`, so editing a role's permissions in the Roles editor takes effect immediately for every signed-in session watching that role — no reload needed. If you need the current roles map outside a component (a non-hook module, like `userManager.js` does), read `useRolesStore.getState().roles` directly instead of importing `DEFAULT_ROLES`.

The **Users** page (admin-only) manages accounts and role assignment; it refuses to demote the last admin or delete yourself. Role/permission changes are recorded in the [audit log](#how-to-audit-log) (`role.created`/`role.updated`/`role.deleted`).

## How to: wire up a real backend for users & roles

Everything above works fully client-side — no server, no signup, IndexedDB only. That's by design for getting started, but it isn't meant to be the permanent story: **swapping in your own user/auth API is a real, supported path**, not an afterthought bolted on later. Every consumer (`useAuth.js`, `LoginDialog.jsx`, `UsersPage.jsx`, `RolesEditor.jsx`, `UserBadge.jsx`) talks to two modules only — `src/auth/userManager.js` and `src/config/rolesStore.js` — through their exported functions, never to `localforage`/`localStorage` directly. That indirection is the entire integration surface: replace what's inside those two files and nothing else in the app needs to change.

Two commented-out reference implementations show exactly what to fill in, same pattern as `dataSources/apiProvider.example.js`:

- **`src/auth/userManager.example.api.js`** — copy it over `userManager.js`, point `authedFetch` at your API. Read its header comment first: it splits "user directory" (a normal REST CRUD resource) from "session" (verifying who's making the request) — the local version's session check is just a client-editable `localStorage` id, which is fine for a local prototype and **not** fine once real user data is behind it. A real backend must verify the caller server-side (a session cookie or bearer token your auth provider issued), never trust a user id the client sends.
- **`src/config/rolesStore.example.api.js`** — copy it over `rolesStore.js`, same idea for role/permission data. `PERMISSION_CATALOG` (auto-discovered from `pages.config.jsx`/`panels.config.jsx`) stays computed locally either way — that part has nothing to do with your backend.

Things that don't change: `PERMISSION_CATALOG`'s discovery logic, the `DEFAULT_ROLES` fallback (keep it as the store's initial state even with a real API — it's what renders before the first fetch resolves and what the app falls back to during a network blip, so a permission check is never looking at nothing), and every UI component. Things that do: every call becomes a real network request, so add loading states and handle failure where the local version's near-instant IndexedDB resolution let the UI skip that (see each example file's header for exactly which call sites need it) — and move every authorization decision that actually matters (demote-the-last-admin, delete-a-role-still-in-use, role assignment) to be enforced server-side too. The client-side checks already in `UsersPage.jsx`/`RolesEditor.jsx` are UX niceties that prevent accidental clicks; they are not a security boundary once a real API is listening.

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

## How to: dashboards & widgets

The **Dashboards** page (`/dashboard`) is a multi-dashboard, drag-and-resize widget grid (react-grid-layout), separate from the floating-panel system. Each dashboard is its own tab (rename, pin, duplicate, delete, drag to reorder — see `src/dashboards/DashboardTabs.jsx`); **+ New** adds one, and the **⋮** menu on a tab can save it as a reusable template or export it as a `.dashboard.json` file for **Import** to bring onto someone else's install.

Adding a widget (the picker's "+ Add Widget") drops a *configured instance* of one of four built-in types — not a new type per widget, so there's no visual editor to build:

| Type | What it shows | `dataShape` |
|---|---|---|
| **Stat** | One number, optional % change vs. a prior period | `aggregate` |
| **Chart** | Bar / line / donut, switchable per instance | `rows` |
| **Table** | Sortable/searchable rows | `rows` |
| **Text** | A static note/heading — no data binding | `none` |

Every widget's config form (field pickers, aggregate/refresh-interval, chart-type-specific fields) is generated from a schema, not hand-built per type — see `src/widgets/widgets.config.jsx` for the full field-kind reference. Add a genuinely new widget type by creating `src/widgets/types/MyWidget.jsx` (it receives `{ instance, rows, fields, value, delta, loading, error }`) and registering it there with a `configSchema`.

## How to: data sources

Widgets bind to a **data source**, addressed as a single `"<providerId>:<datasetId>"` string (e.g. `mock:weekly_signups`). Two providers ship built-in:

- **`mock`** — a handful of demo datasets (`weekly_signups`, `daily_traffic`, `recent_activity`, …) so new widgets show real-looking data immediately.
- **`csv`** — files your users import via the **Data Sources** panel (or the inline "+ Import CSV…" shortcut inside a widget's config form). They show up in every "Data source" dropdown app-wide as soon as they're imported.

To wire up a real API, write a new provider module matching the three-method shape every provider implements — `listDatasets()`, `getSchema(datasetId)`, `fetch(datasetId, params)`, plus an optional `subscribe(datasetId, cb)` for live sources (`src/dataSources/apiProvider.example.js` is a commented-out starting point) — and register it in `src/dataSources/dataSources.config.js`. No widget code changes: `useWidgetData.js` is the only thing that ever calls into a provider.

## How to: charts

```jsx
import { BarChart, LineChart, DonutChart } from '../components/charts'

<BarChart data={rows} xKey="month" stacked
  series={[{ key: 'signups', label: 'Signups' }, { key: 'churn', label: 'Churn' }]} />
```

Tooltips, legends (auto for ≥2 series), and theming are built in. Series colors come from `--chart-1…8` — a colorblind-validated palette with separate light/dark steps. The slot *order* is the accessibility mechanism: assign in order, don't shuffle, and prefer ≤4 series (DonutChart folds extras into "Other" automatically).

## How to: forms & validation

```jsx
import { useForm, Field, validators } from '../components/forms'

const form = useForm({
  initialValues: { name: '', email: '' },
  validate: (v) => ({
    name:  validators.required()(v.name),
    email: validators.compose(validators.required(), validators.email())(v.email),
  }),
  onSubmit: async (values) => { await api.save(values) },
})

<form onSubmit={form.handleSubmit}>
  <Field.Text label="Name" required {...form.field('name')} />
  <Field.Text label="Email" required type="email" {...form.field('email')} />
  <button type="submit" disabled={form.submitting}>Save</button>
</form>
```

`Field` also has `.Select`, `.Textarea`, `.Checkbox`, and `.Color`. Errors only show once a field is touched or the form is submitted — see the Users page's "Add User" form or the UI Kit's Forms tab for full examples. `validators` composes: `required`, `minLength`, `maxLength`, `pattern`, `email`, `oneOf`, and `compose(...)` to chain them.

## How to: command palette

`Cmd/Ctrl+K` (or the search box in the top bar) opens a fuzzy-searchable menu over every page, every panel, and a handful of built-in actions (theme, sidebar, sign out) — all pulled live from the same registries that drive the sidebar. To add your own action (e.g. a page-specific "Export this report"), call `registerCommand` from `src/command/commandRegistry.jsx` when your page mounts, and unregister it on unmount (the function returns an unsubscribe).

## How to: notifications

Distinct from toasts (`addToast`, which disappear in 4s): notifications persist in the bell dropdown with read/unread state until dismissed, and survive a refresh.

```js
import { pushNotification } from '../notifications/notificationStore'
pushNotification({ title: 'Export finished', body: 'report.csv is ready', type: 'success' })
```

## How to: audit log

A permanent "who did what, when" record — distinct from both toasts (disappear in 4s) and notifications (dismissable bell feed, meant for the signed-in user themselves). Audit entries are never dismissed by a user; they're meant to be reviewed later by an admin on the **Audit Log** page (`/audit-log`, gated by `audit.view` — admins only via the `'*'` permission) and aren't removed except by that page's "Clear log" action or the oldest-entry cap (500).

```js
import { logAction } from '../audit/auditStore'

logAction({ action: 'user.created', target: user.username, meta: { role: user.role } })
logAction({ action: 'role.changed', target: user.username, meta: { from: 'viewer', to: 'admin' } })
```

- `action` — a short dot-namespaced string (`resource.verb`). Give it a label in `ACTION_LABELS` in `src/pages/AuditLogPage.jsx` so it renders as a colored badge instead of the raw key.
- `target` — the human-readable subject of the action (a username, record name, etc.), shown as its own column.
- `meta` — optional extra detail (e.g. `{ from, to }` for a change); `AuditLogPage.jsx`'s `describeMeta()` currently only renders `from`/`to` pairs — extend it if you log richer meta.

`logAction` stamps the **currently active user** as the actor automatically — call it *before* clearing the active user (see `signOut` in `src/auth/useAuth.js`), not after, or the entry logs as `guest`. Built-in call sites to copy from: user create/role-change/delete in `src/pages/UsersPage.jsx`, sign-in in `src/auth/LoginDialog.jsx`, sign-out in `src/auth/useAuth.js`.

> ⚠️ Like `userManager.js`, this is a local, client-side log (IndexedDB via localforage) — it lives on one device/browser and isn't shared across users or tamper-proof, so it's not sufficient as a real compliance/security audit trail. **To wire it up to a real backend later:**
> 1. In `src/audit/auditStore.js`, make `log()` also `POST` the entry to your API (e.g. `fetch('/api/audit', { method: 'POST', body: JSON.stringify(entry) })`), fire-and-forget alongside the existing `localforage.setItem` write — keep the local write too, so the log stays populated offline and the UI stays instant.
> 2. Point `load()` at a `GET` from that same endpoint instead of (or merged with) `localforage.getItem`, so `AuditLogPage` shows server-side history across devices, not just this browser's.
> 3. Keep `logAction`'s call signature (`{ action, target, meta }`) stable — every call site in the app only depends on that shape, the same way `userManager.js`'s functions are meant to be swapped without touching call sites elsewhere.
> 4. Server-side, prefer stamping the actor and timestamp from the authenticated request rather than trusting the client-sent `userId`/`ts` — the local version trusts them because there's no server to ask.

## How to: data tables — selection, bulk actions, CSV export

```jsx
<DataTable
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'note', label: 'Note', priority: 'low' },  // hidden on phone widths
  ]}
  rows={rows}
  searchable
  selectable
  exportFilename="my-export"   // adds an "Export CSV" button
  bulkActions={(selectedRows, clearSelection) => (
    <button onClick={() => handleBulkDelete(selectedRows, clearSelection)}>Delete</button>
  )}
/>
```

`priority: 'low'` on a column hides it below 640px instead of forcing the table into horizontal scroll — the Users page uses this for its "Created" column.

## How to: loading skeletons

```jsx
import { Skeleton } from '../components/ui'

<Skeleton.Stat />                    // shape of a StatCard
<Skeleton.Chart height={220} />      // shape of a Bar/Line/Donut chart
<Skeleton.Table rows={4} cols={4} /> // shape of a DataTable
<Skeleton.Text lines={3} />          // a paragraph of varying-width lines
<Skeleton.Page />                    // a full page: header block + one card
<Skeleton width={80} height={30} />  // one custom-sized block
```

Used two ways in the shell already: `App.jsx`'s route `<Suspense fallback={<Skeleton.Page />}>` (so switching pages shows a page-shaped placeholder instead of a blank flash while its lazy chunk loads), and each widget type's own loading branch in `src/widgets/types/` (`StatWidget`/`ChartWidget`/`TableWidget`). If you add a new widget type or page-like view with its own loading state, reach for `Skeleton` before a plain "Loading…" string — it reads as "content is about to appear" rather than a stall.

One rule worth keeping if you copy the widget pattern: gate the skeleton on **first load only** (no data yet), not on `loading` alone. `useWidgetData.js` sets `loading: true` on every refetch — including a background poll tick on an already-loaded widget, where the previous rows/value are still sitting there, still valid. Re-skeletonizing on every one of those would blank out perfectly good stale data on a timer instead of quietly updating in place — see any of the three widget types' `if (loading && rows.length === 0)` (or `value == null` for Stat) guard for the pattern.

## How to: testing

**Unit tests** (Vitest, no browser) cover store logic — actions, selectors, and persistence merge behavior — by calling `useAppStore.getState()` / `useAppStore.setState()` directly; nothing needs to render. Colocate a new test file next to the module it covers: `src/store/useAppStore.<topic>.test.js`.

```bash
npm test           # run once (CI-style)
npm run test:watch # watch mode while developing
```

**End-to-end tests** (`@playwright/test`) cover real browser flows — drag-and-drop, portals, CSS visibility, persistence across an actual page reload — that can't be verified without a DOM. Specs live in `tests/e2e/*.spec.js`; shared helpers (like dismissing the first-run login dialog deterministically) live in `tests/e2e/fixtures.js` — see `loggedInPage` there for the pattern.

```bash
npx playwright install chromium   # first time only — downloads the browser
npm run test:e2e                  # headless run; starts the dev server automatically
npm run test:e2e:ui               # interactive UI mode, useful while writing a new spec
```

Add new unit tests next to the store/module they cover; add new e2e specs to `tests/e2e/` for flows that span multiple components (panels + sidebar + persistence, for example) and genuinely need a browser.

## Built-ins

- **Theme** — dark / light / auto (follows OS), cycled from the top bar or `T`. All colors are CSS variables in `styles/index.css`; retheme by editing `:root` / `html[data-theme="light"]`.
- **Sidebar** — nav from the page registry + panel toggles; collapses to an icon rail (`Cmd/Ctrl+B`); hidden on mobile (hamburger menu takes over).
- **Breadcrumbs** — top-bar "where am I" trail (`src/components/Breadcrumbs.jsx`), resolved from `pages.config.jsx` via route matching (not string equality, so it works on dynamic routes). A route's dynamic param can resolve to an extra trailing crumb — currently wired for `/dashboard/:dashboardId` → the dashboard's real name; see the component's comment for how to add another.
- **Loading skeletons** — `import { Skeleton } from '../components/ui'`. `Skeleton.Page` is the page-route Suspense fallback (`App.jsx`); `Skeleton.Stat`/`.Chart`/`.Table` back the matching widget types' first-load state in `src/widgets/types/` — gated on "loading AND no data yet" so a background refresh/poll tick never blanks out still-valid stale data, only an actual first load with nothing to show yet.
- **Keyboard shortcuts** — `Cmd/Ctrl+K` command palette, `Cmd/Ctrl+1…9` panels, `Cmd/Ctrl+\`` toggle all, `Esc` close all, `Cmd/Ctrl+B` sidebar, `Cmd/Ctrl+D` dock rail, `T` theme, `?` shortcut list.
- **Command palette** — `Cmd/Ctrl+K`; see "How to: command palette" above.
- **Notifications** — persistent bell dropdown, separate from toasts; see "How to: notifications" above.
- **Audit log** — permanent activity record (`/audit-log`, admin-only), separate from both toasts and notifications; see "How to: audit log" above.
- **Toasts** — `useAppStore.getState().addToast({ type: 'success'|'error'|'info'|'warning', message })`.
- **Persistence** — theme, sidebar state, panel layout (including dock state), and dashboards auto-save per user (guests get a shared slot) and restore on load.
- **Save status** — a small "Saving…/Saved" readout next to the page title in the top bar, fed by every auto-save pipeline above. Report into it from your own persistence code via `useAppStore.getState().reportSaving()/.reportSaved()/.reportSaveError()` — see `src/components/SaveStatusIndicator.jsx`.
- **Forms** — `useForm` + `Field.*` + `validators`; see "How to: forms & validation" above.
- **UI component library** — `import { Modal, ConfirmDialog, Tabs, Collapsible, ProgressBar, SearchInput, DataTable, StatCard, PageHeader, EmptyState } from '../components/ui'`. DataTable is sortable/searchable/paginated, with optional row selection, bulk actions, and CSV export.
- **UI Kit page** — a living gallery of everything above, organized in tabs (Basics / Components / Forms / Charts).
- **Dashboards** — multi-dashboard widget grid (Stat/Chart/Table/Text widgets, no-code config forms, data source binding, save-as-template/export/import); see "How to: dashboards & widgets" above.
- **Docking** — any floating panel can be docked into a tabbed side rail instead; see "How to: add a floating panel" above.
- **Responsive** — sidebar and search collapse into a hamburger menu below 768px; stat grids and dashboards reflow at 640px/420px; tables hide `priority: 'low'` columns instead of scrolling; the dock rail hides below 768px (docked panels fall back to floating).

## Redeploy checklist for a new tool

1. `src/config/app.config.jsx` — name, tagline, logo, theme, guest policy
2. `index.html` — `<title>` + meta description; `public/favicon.svg`
3. `package.json` — `name`, `version`
4. `src/config/roles.config.js` — your default roles/permissions (or just create/edit roles later via the Users page's Roles editor — no redeploy needed for that)
5. Replace `HomePage.jsx`, add your pages/panels to the registries
6. Delete `NotesPanel` / `ExamplePage` if you don't want the demos
7. Clear or replace the seeded default dashboard (`initDashboardStorage` in `src/dashboards/dashboardStorage.js`) and the `mock` data source's demo datasets (`src/dataSources/mockProvider.js`) once you have real data
8. If you need audit history to survive beyond one browser (or count as a real compliance trail), wire `src/audit/auditStore.js` up to a backend — see "How to: audit log" above
