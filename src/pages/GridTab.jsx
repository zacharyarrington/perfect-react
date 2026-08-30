// GridTab — "Layout Grid" tab for the UI Kit page.
//
// A hands-on intro to the three grid approaches available in this template:
//   1. CSS Grid via the existing `.dashboard-grid` / `.stat-grid` utility
//      classes (see src/styles/index.css) — the simplest option for static
//      page layouts that don't need to be user-rearrangeable.
//   2. Tailwind's grid utilities — same idea, written inline with utility
//      classes instead of a stylesheet rule. Handy for one-off layouts you
//      don't want to name a CSS class for.
//   3. react-grid-layout — a draggable, resizable, responsive grid. This is
//      the actual engine behind the Dashboard page (see
//      src/dashboards/DashboardCanvas.jsx) for when a layout needs to be
//      user-editable, not just author-defined.
//
// Copy whichever section matches what you're building — a fixed page layout
// almost always wants #1 or #2; a drag/resize canvas wants #3.

import { useState } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

// ── Demo: react-grid-layout starting positions ──────────────────────────────
// Each item needs i (id), x/y (grid cell position), w/h (size in cells).
const INITIAL_LAYOUT = [
  { i: 'a', x: 0, y: 0, w: 4, h: 2 },
  { i: 'b', x: 4, y: 0, w: 4, h: 2 },
  { i: 'c', x: 8, y: 0, w: 4, h: 2 },
  { i: 'd', x: 0, y: 2, w: 8, h: 2 },
]

function CodeBlock({ children }) {
  return (
    <pre
      style={{
        background: 'var(--bg-base)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font-mono)',
        overflowX: 'auto',
        lineHeight: 1.6,
      }}
    >
      <code>{children}</code>
    </pre>
  )
}

function DemoBox({ label }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--text-sm)',
        color: 'var(--text-secondary)',
        height: '100%',
        minHeight: 64,
      }}
    >
      {label}
    </div>
  )
}

export default function GridTab() {
  const [rglLayout, setRglLayout] = useState(INITIAL_LAYOUT)

  return (
    <>
      <div className="card">
        <div className="card-title">Which one do I want?</div>
        <div className="card-desc" style={{ marginTop: 4 }}>
          <strong>Static page layout</strong> (cards, forms, a dashboard-style overview) →
          reach for CSS Grid, either the existing <code>.dashboard-grid</code> class or
          Tailwind's <code>grid</code> utilities. <strong>Layout the user can drag and
          resize</strong> (a customizable dashboard canvas) → use{' '}
          <code>react-grid-layout</code>, the same engine behind the Dashboard page.
        </div>
      </div>

      {/* ── 1. CSS Grid via existing utility class ── */}
      <div className="card">
        <div className="card-title">1. CSS Grid — <code>.dashboard-grid</code></div>
        <div className="card-desc" style={{ marginTop: 4, marginBottom: 12 }}>
          Auto-fits columns at a minimum width and wraps responsively with zero JS. Defined once
          in <code>src/styles/index.css</code>, reused anywhere. This is what the Charts tab uses.
        </div>
        <div className="dashboard-grid" style={{ marginBottom: 12 }}>
          <DemoBox label="Card A" />
          <DemoBox label="Card B" />
          <DemoBox label="Card C" />
        </div>
        <CodeBlock>{`<div className="dashboard-grid">
  <div className="card">Card A</div>
  <div className="card">Card B</div>
  <div className="card">Card C</div>
</div>

/* index.css */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-5);
}`}</CodeBlock>
      </div>

      {/* ── 2. Tailwind grid utilities ── */}
      <div className="card">
        <div className="card-title">2. Tailwind grid utilities</div>
        <div className="card-desc" style={{ marginTop: 4, marginBottom: 12 }}>
          Same CSS Grid, written inline — no stylesheet rule to name or maintain. Tailwind is
          available app-wide as utility classes only (no Preflight reset), so these mix freely
          with the existing <code>.btn</code> / <code>.card</code> / <code>.input</code> classes.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ marginBottom: 12 }}>
          <DemoBox label="col 1" />
          <DemoBox label="col 2" />
          <DemoBox label="col 3" />
          <div className="lg:col-span-2">
            <DemoBox label="col-span-2" />
          </div>
          <DemoBox label="col 1" />
        </div>
        <CodeBlock>{`<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>col 1</div>
  <div>col 2</div>
  <div>col 3</div>
  <div className="lg:col-span-2">col-span-2</div>
  <div>col 1</div>
</div>`}</CodeBlock>
        <div className="card-desc" style={{ marginTop: 12 }}>
          Common utilities you'll reach for: <code>grid-cols-N</code>, <code>col-span-N</code>,{' '}
          <code>gap-N</code>, <code>flex</code> / <code>items-center</code> /{' '}
          <code>justify-between</code>, and responsive prefixes <code>sm:</code> /{' '}
          <code>md:</code> / <code>lg:</code>.
        </div>
      </div>

      {/* ── 3. react-grid-layout ── */}
      <div className="card">
        <div className="card-title">3. react-grid-layout — drag &amp; resize</div>
        <div className="card-desc" style={{ marginTop: 4, marginBottom: 12 }}>
          Drag a tile by its body or resize from the bottom-right corner. Positions are just
          <code>{'{ x, y, w, h }'}</code> in a 12-column grid — persist that array (per dashboard,
          this lives in <code>useDashboardStore</code>) and you get a saved, user-editable layout.
        </div>
        <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 8, marginBottom: 12 }}>
          <ResponsiveGridLayout
            layouts={{ lg: rglLayout }}
            breakpoints={{ lg: 0 }}
            cols={{ lg: 12 }}
            rowHeight={48}
            margin={[12, 12]}
            compactType="vertical"
            useCSSTransforms
            resizeHandles={['se']}
            onLayoutChange={(layout) => setRglLayout(layout)}
          >
            {INITIAL_LAYOUT.map((item) => (
              <div key={item.i}>
                <DemoBox label={`Tile ${item.i.toUpperCase()}`} />
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
        <CodeBlock>{`import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

const [layout, setLayout] = useState([
  { i: 'a', x: 0, y: 0, w: 4, h: 2 },
  { i: 'b', x: 4, y: 0, w: 4, h: 2 },
])

<ResponsiveGridLayout
  layouts={{ lg: layout }}
  breakpoints={{ lg: 0 }}
  cols={{ lg: 12 }}
  rowHeight={48}
  onLayoutChange={(l) => setLayout(l)}
>
  <div key="a">Tile A</div>
  <div key="b">Tile B</div>
</ResponsiveGridLayout>`}</CodeBlock>
        <div className="card-desc" style={{ marginTop: 12 }}>
          For a full multi-breakpoint, drag-handle, collision-aware setup — see{' '}
          <code>src/dashboards/DashboardCanvas.jsx</code>, which this demo is a trimmed-down
          version of. Notably it writes layout changes back to the store only on{' '}
          <code>onDragStop</code>/<code>onResizeStop</code>, not <code>onLayoutChange</code>{' '}
          (which also fires on mount/compaction and causes jitter if used as the write path).
        </div>
      </div>
    </>
  )
}
