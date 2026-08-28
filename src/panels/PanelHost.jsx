// PanelHost — mounts every registered floating panel (see config/panels.config).
// Panels the current role can't access are not mounted at all, so their
// keyboard shortcuts and toggles are inert too.

import { Suspense } from 'react'
import PANELS from '../config/panels.config'
import useAuth from '../auth/useAuth'

export default function PanelHost() {
  const { hasPermission } = useAuth()

  return (
    <Suspense fallback={null}>
      {PANELS.filter((p) => hasPermission(p.permission)).map((p) => {
        const Panel = p.component
        return <Panel key={p.key} />
      })}
    </Suspense>
  )
}
