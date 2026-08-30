// WidgetRenderer — resolves a widget instance's type from the registry,
// renders its component, and wraps it in WidgetErrorBoundary so a render
// crash in one widget (bad data shape, a chart library edge case) can never
// take the rest of the dashboard down with it. resetKey is a stable string
// of the instance's config/binding, so editing a widget's settings clears a
// stuck crash instead of leaving it wedged until the page reloads.

import { Suspense } from 'react'
import { WIDGET_TYPES_BY_ID } from './widgets.config'
import WidgetErrorBoundary from './WidgetErrorBoundary'

export default function WidgetRenderer({ instance }) {
  const type = WIDGET_TYPES_BY_ID[instance.type]
  if (!type) {
    return <div className="widget-placeholder">Unknown widget type "{instance.type}"</div>
  }
  const Component = type.component
  const resetKey = JSON.stringify({ config: instance.config, binding: instance.binding })
  return (
    <WidgetErrorBoundary title={instance.title || type.title} resetKey={resetKey}>
      <Suspense fallback={null}>
        <Component instance={instance} />
      </Suspense>
    </WidgetErrorBoundary>
  )
}
