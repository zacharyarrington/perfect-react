// ExamplePage ("UI Kit") — a living reference of the template's built-in
// styles and components. Copy this file as the starting point for new pages,
// then register the copy in config/pages.config.jsx.

import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import RequirePermission from '../auth/RequirePermission'

export default function ExamplePage() {
  const addToast = useAppStore((s) => s.addToast)
  const [toggleOn, setToggleOn] = useState(true)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">UI Kit</h1>
        <p className="page-subtitle">The building blocks available to every page and panel.</p>
      </div>

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
            <button
              key={type}
              className="btn btn-ghost btn-sm"
              onClick={() => addToast({ type, message: `A ${type} toast` })}
            >
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
            <select className="select">
              <option>Option A</option>
              <option>Option B</option>
            </select>
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
          <span className="badge badge-teal">teal</span>
          <span className="badge badge-blue">blue</span>
          <span className="badge badge-purple">purple</span>
          <span className="badge badge-amber">amber</span>
          <span className="badge badge-red">red</span>
          <span className="badge badge-green">green</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Data table</div>
        <div className="data-table-wrapper" style={{ marginTop: 8 }}>
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Status</th><th>Updated</th></tr>
            </thead>
            <tbody>
              <tr><td>Alpha</td><td><span className="badge badge-green">active</span></td><td>Today</td></tr>
              <tr><td>Beta</td><td><span className="badge badge-amber">pending</span></td><td>Yesterday</td></tr>
              <tr><td>Gamma</td><td><span className="badge badge-red">failed</span></td><td>Last week</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Permission gates</div>
        <div className="card-desc" style={{ marginBottom: 8 }}>
          Content below is wrapped in <code>&lt;RequirePermission permission=&quot;users.manage&quot;&gt;</code> —
          only administrators see the secret.
        </div>
        <RequirePermission
          permission="users.manage"
          fallback={<span className="badge badge-amber">Hidden — requires users.manage</span>}
        >
          <span className="badge badge-teal">🎉 You have users.manage</span>
        </RequirePermission>
      </div>
    </div>
  )
}
