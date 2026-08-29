// DashboardCanvas — the react-grid-layout drag/resize surface for one
// dashboard's widgets.
//
// Pinned to react-grid-layout@1.5.4 (the classic, long-established API)
// deliberately rather than the current 2.x line: 2.x is a ground-up
// TypeScript rewrite (first released Dec 2025) that reproducibly hung the
// tab when this feature was first built — see the postmortem in
// useDashboardStore.js's placeNewWidget comment for the actual root cause,
// which turned out to be a missing x/y on new widgets, not the library
// itself. 1.5.4 was kept anyway since it's a decade-proven implementation
// with no reason to prefer an untested rewrite.
//
// Geometry lives on each widget instance (widget.layout) in useDashboardStore
// — never in a second array — so the two can't desync. The `layouts.lg`
// array passed to ResponsiveGridLayout is DERIVED from the widgets on every
// render:
//
//   dashboard.widgets.map((w) => ({ i: w.id, ...w.layout }))
//
// Write-back happens ONLY on onDragStop/onResizeStop (not onLayoutChange,
// which also fires on mount and on every compaction pass — using it as the
// write path is what causes the classic RGL "fights your own state" jitter).
// Only the `lg` breakpoint is ever written back to the store; narrower
// breakpoints are library-derived and shown as-is, so resizing the browser
// narrow can never silently overwrite a deliberately-arranged desktop
// layout.

import { useMemo, useRef } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import useDashboardStore from './useDashboardStore'
import WidgetFrame from './WidgetFrame'
import WidgetRenderer from '../widgets/WidgetRenderer'
import { WIDGET_TYPES_BY_ID } from '../widgets/widgets.config'

const ResponsiveGridLayout = WidthProvider(Responsive)

// WidthProvider measures the CANVAS CONTAINER, not the browser viewport —
// it sits inside the content area, to the right of the sidebar, so its
// width is always meaningfully less than window.innerWidth. Bootstrap-style
// viewport breakpoints (lg: 1200 etc.) silently never hit "lg" on an
// ordinary laptop window once the sidebar is subtracted, which surfaced as
// dragged/resized widgets never persisting: the write-back guard requires
// breakpoint === 'lg' (see handleDragOrResizeStop) so writes were being
// discarded under a breakpoint name that looked plausible but was wrong for
// this container. These thresholds are calibrated to the canvas's own
// width instead.
const BREAKPOINTS = { lg: 900, md: 700, sm: 520, xs: 360, xxs: 0 }
const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }

export default function DashboardCanvas({ dashboard, onConfigureWidget }) {
  const { applyLayout, removeWidget, duplicateWidget } = useDashboardStore()
  // onDragStop/onResizeStop receive (layout, oldItem, newItem, placeholder,
  // event, element) — no breakpoint — so the active one is tracked via
  // onBreakpointChange and read through a ref (not state) so a drag that
  // stops immediately after a breakpoint change always sees the current
  // value rather than one render behind.
  const currentBreakpointRef = useRef('lg')

  const layouts = useMemo(() => ({
    lg: dashboard.widgets.map((w) => ({ i: w.id, ...w.layout })),
  }), [dashboard.widgets])

  const handleDragOrResizeStop = (layout) => {
    if (currentBreakpointRef.current !== 'lg') return
    applyLayout(dashboard.id, layout)
  }

  if (dashboard.widgets.length === 0) {
    return (
      <div className="widget-canvas widget-canvas-empty">
        <div className="empty-state">
          <div className="empty-state-title">This dashboard is empty</div>
          <div className="empty-state-desc">Open the widget picker to add your first widget.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="widget-canvas">
      <ResponsiveGridLayout
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={dashboard.rowHeight || 60}
        margin={[16, 16]}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms
        draggableHandle=".widget-drag-handle"
        draggableCancel=".widget-no-drag"
        resizeHandles={['se']}
        onBreakpointChange={(bp) => { currentBreakpointRef.current = bp }}
        onDragStop={handleDragOrResizeStop}
        onResizeStop={handleDragOrResizeStop}
      >
        {dashboard.widgets.map((widget) => {
          const type = WIDGET_TYPES_BY_ID[widget.type]
          return (
            <div key={widget.id}>
              <WidgetFrame
                title={widget.title || type?.title || 'Widget'}
                icon={type?.icon}
                onSettings={() => onConfigureWidget(widget)}
                onDuplicate={() => duplicateWidget(dashboard.id, widget.id)}
                onRemove={() => removeWidget(dashboard.id, widget.id)}
              >
                <WidgetRenderer instance={widget} />
              </WidgetFrame>
            </div>
          )
        })}
      </ResponsiveGridLayout>
    </div>
  )
}
