// ExamplePage ("UI Kit") — a living reference of every building block in the
// template. Copy patterns from here into your own pages.

import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import RequirePermission from '../auth/RequirePermission'
import {
  PageHeader, Tabs, Modal, ConfirmDialog, Collapsible,
  ProgressBar, SearchInput, DataTable, StatCard, EmptyState,
} from '../components/ui'
import { BarChart, LineChart, DonutChart } from '../components/charts'
import { useForm, Field, validators } from '../components/forms'
import { pushNotification } from '../notifications/notificationStore'
import GridTab from './GridTab'
import { IconUsers, IconInbox, IconRocket } from '@tabler/icons-react'

// ── Demo data ────────────────────────────────────────────────────────────────

const TABLE_ROWS = [
  { id: 1, name: 'Aurora',   owner: 'Riley', size: 412, status: 'active' },
  { id: 2, name: 'Basalt',   owner: 'Sam',   size: 87,  status: 'pending' },
  { id: 3, name: 'Cinder',   owner: 'Jo',    size: 1024, status: 'active' },
  { id: 4, name: 'Drift',    owner: 'Riley', size: 256, status: 'failed' },
  { id: 5, name: 'Ember',    owner: 'Alex',  size: 640, status: 'active' },
  { id: 6, name: 'Flint',    owner: 'Sam',   size: 33,  status: 'pending' },
  { id: 7, name: 'Granite',  owner: 'Jo',    size: 764, status: 'active' },
]
const STATUS_BADGE = { active: 'badge-green', pending: 'badge-amber', failed: 'badge-red' }

const MINI_BARS = [
  { q: 'Q1', a: 40, b: 24 }, { q: 'Q2', a: 55, b: 30 },
  { q: 'Q3', a: 47, b: 41 }, { q: 'Q4', a: 68, b: 38 },
]
const MINI_LINE = [
  { m: 'Jan', v: 12 }, { m: 'Feb', v: 19 }, { m: 'Mar', v: 16 },
  { m: 'Apr', v: 27 }, { m: 'May', v: 24 }, { m: 'Jun', v: 33 },
]
const MINI_DONUT = [
  { name: 'API', value: 46 }, { name: 'Web', value: 32 }, { name: 'Mobile', value: 22 },
]

// ── Tab: basics ──────────────────────────────────────────────────────────────

function BasicsTab() {
  const addToast = useAppStore((s) => s.addToast)
  const [toggleOn, setToggleOn] = useState(true)

  return (
    <>
      <div className="card">
        <div className="card-title">Buttons</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn btn-primary">Primary</button>
          <button className="btn btn-ghost">Ghost</button>
          <button className="btn btn-danger">Danger</button>
          <button className="btn btn-primary btn-sm">Small</button>
          <button className="btn btn-ghost btn-xs">Tiny</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Toasts</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {['success', 'info', 'warning', 'error'].map((type) => (
            <button key={type} className="btn btn-ghost btn-sm" onClick={() => addToast({ type, message: `A ${type} toast` })}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Form elements</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 8 }}>
          <div className="form-row">
            <label className="label">Text input</label>
            <input className="input" placeholder="Type something…" />
          </div>
          <div className="form-row">
            <label className="label">Select</label>
            <select className="select"><option>Option A</option><option>Option B</option></select>
          </div>
          <div className="form-row">
            <label className="label">Toggle</label>
            <label className="toggle">
              <input type="checkbox" checked={toggleOn} onChange={(e) => setToggleOn(e.target.checked)} />
              <span className="toggle-track" />
              <span className="toggle-label">{toggleOn ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <div className="form-row">
            <label className="label">Slider</label>
            <input type="range" className="slider" defaultValue={60} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Badges</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {['teal', 'blue', 'purple', 'amber', 'red', 'green'].map((c) => (
            <span key={c} className={`badge badge-${c}`}>{c}</span>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Permission gates</div>
        <div className="card-desc" style={{ marginBottom: 8 }}>
          Wrapped in <code>&lt;RequirePermission permission=&quot;users.manage&quot;&gt;</code> —
          only administrators see the secret.
        </div>
        <RequirePermission
          permission="users.manage"
          fallback={<span className="badge badge-amber">Hidden — requires users.manage</span>}
        >
          <span className="badge badge-teal">🎉 You have users.manage</span>
        </RequirePermission>
      </div>
    </>
  )
}

// ── Tab: components ──────────────────────────────────────────────────────────

function ComponentsTab() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [search, setSearch] = useState('')
  const addToast = useAppStore((s) => s.addToast)

  return (
    <>
      <div className="stat-grid">
        <StatCard label="Stat card" value="1,284" delta={12.4} deltaLabel="vs last week" icon={<IconUsers size={16} />} />
        <StatCard label="Inverted delta" value="9" delta={-40} invertDelta deltaLabel="down is good" />
        <StatCard label="No delta" value="4m 32s" />
      </div>

      <div className="card">
        <div className="card-title">Modal &amp; confirm dialog</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(true)}>Open modal</button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmOpen(true)}>Open confirm</button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example modal"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setModalOpen(false)}>Save</button>
            </>
          }
        >
          <div className="form-row">
            <label className="label">A field</label>
            <input className="input" placeholder="Modal content is just children…" />
          </div>
        </Modal>
        <ConfirmDialog
          open={confirmOpen}
          title="Delete widget?"
          message="This action can't be undone."
          danger
          confirmLabel="Delete"
          onConfirm={() => { setConfirmOpen(false); addToast({ type: 'info', message: 'Confirmed (demo)' }) }}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>

      <div className="card">
        <div className="card-title">Search input &amp; progress</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 8 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search anything…" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ProgressBar value={62} label="Sync" showValue />
            <ProgressBar value={8} max={10} label="Storage" showValue color="var(--accent-warm)" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Collapsible</div>
        <div style={{ marginTop: 8 }}>
          <Collapsible title="Advanced options">
            <p style={{ fontSize: 'var(--text-sm)' }}>Anything can live inside a collapsible section.</p>
          </Collapsible>
          <Collapsible title="Open by default" defaultOpen>
            <p style={{ fontSize: 'var(--text-sm)' }}>This one starts expanded.</p>
          </Collapsible>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Data table — sortable, searchable, paginated</div>
        <div style={{ marginTop: 8 }}>
          <DataTable
            columns={[
              { key: 'name', label: 'Name', sortable: true },
              { key: 'owner', label: 'Owner', sortable: true },
              { key: 'size', label: 'Size (MB)', sortable: true },
              { key: 'status', label: 'Status', render: (r) => <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span> },
            ]}
            rows={TABLE_ROWS}
            searchable
            pageSize={5}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Empty state</div>
        <EmptyState
          icon={<IconInbox size={30} />}
          title="Nothing here yet"
          desc="Use <EmptyState> wherever a list can be empty."
          action={<button className="btn btn-primary btn-sm"><IconRocket size={14} /> Do the thing</button>}
        />
      </div>
    </>
  )
}

// ── Tab: forms ───────────────────────────────────────────────────────────────

function FormsTab() {
  const addToast = useAppStore((s) => s.addToast)

  const form = useForm({
    initialValues: { name: '', email: '', role: 'viewer', bio: '', notify: true },
    validate: (v) => ({
      name: validators.compose(validators.required(), validators.maxLength(40))(v.name),
      email: validators.compose(validators.required(), validators.email())(v.email),
    }),
    onSubmit: async (values) => {
      await new Promise((r) => setTimeout(r, 500)) // pretend to hit an API
      pushNotification({ title: 'Form submitted', body: `${values.name} (${values.role})`, type: 'success' })
      addToast({ type: 'success', message: 'Submitted — check the notification bell' })
      form.reset()
    },
  })

  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <div className="card-title" style={{ marginBottom: 4 }}>useForm + Field</div>
      <div className="card-desc" style={{ marginBottom: 12 }}>
        Validation runs on every change but errors only show once a field is touched or you submit.
        This exact pattern powers the "Add User" form on the Users page.
      </div>
      <form onSubmit={form.handleSubmit}>
        <Field.Text label="Name" required {...form.field('name')} placeholder="Jane Doe" />
        <Field.Text label="Email" required type="email" {...form.field('email')} placeholder="jane@example.com" />
        <Field.Select
          label="Role"
          {...form.field('role')}
          options={[{ value: 'admin', label: 'Administrator' }, { value: 'editor', label: 'Editor' }, { value: 'viewer', label: 'Viewer' }]}
        />
        <Field.Textarea label="Bio" hint="Optional" rows={3} {...form.field('bio')} placeholder="A short bio…" />
        <Field.Checkbox label="Notify by email" {...form.field('notify')} />
        {form.submitError && <div className="field-error" style={{ marginBottom: 12 }}>{form.submitError}</div>}
        <button type="submit" className="btn btn-primary" disabled={form.submitting}>
          {form.submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </div>
  )
}

// ── Tab: charts ──────────────────────────────────────────────────────────────

function ChartsTab() {
  return (
    <>
      <div className="card">
        <div className="card-desc" style={{ marginBottom: 4 }}>
          Chart wrappers live in <code>src/components/charts</code> — themed, colorblind-validated
          palette, tooltips and legends included. See the Dashboard page for a full example.
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>BarChart (grouped)</div>
          <BarChart data={MINI_BARS} xKey="q" height={200}
            series={[{ key: 'a', label: 'Product A' }, { key: 'b', label: 'Product B' }]} />
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>LineChart (single series)</div>
          <LineChart data={MINI_LINE} xKey="m" height={200} series={[{ key: 'v', label: 'Value' }]} />
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>DonutChart</div>
          <DonutChart data={MINI_DONUT} height={200} />
        </div>
      </div>
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ExamplePage() {
  return (
    <div className="page">
      <PageHeader title="UI Kit" subtitle="The building blocks available to every page and panel." />
      <Tabs
        tabs={[
          { key: 'basics', label: 'Basics', content: <BasicsTab /> },
          { key: 'components', label: 'Components', content: <ComponentsTab /> },
          { key: 'forms', label: 'Forms', content: <FormsTab /> },
          { key: 'charts', label: 'Charts', content: <ChartsTab /> },
          { key: 'grid', label: 'Layout Grid', content: <GridTab /> },
        ]}
      />
    </div>
  )
}
