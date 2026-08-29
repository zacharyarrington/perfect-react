// WidgetRenderer — resolves a widget instance's type from the registry and
// renders its component. Data binding (useWidgetData) lands in a later
// stage; for now this just mounts the type component with the instance.

import { Suspense } from 'react'
import { WIDGET_TYPES_BY_ID } from './widgets.config'

export default function WidgetRenderer({ instance }) {
  const type = WIDGET_TYPES_BY_ID[instance.type]
  if (!type) {
    return <div className="widget-placeholder">Unknown widget type "{instance.type}"</div>
  }
  const Component = type.component
  return (
    <Suspense fallback={null}>
      <Component instance={instance} />
    </Suspense>
  )
}
