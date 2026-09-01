// PanelHost — mounts every registered floating panel (see config/panels.config).
// Panels the current role can't access are not mounted at all, so their
// keyboard shortcuts and toggles are inert too.

import { Suspense } from 'react'
import PANELS from '../config/panels.config'
import useAuth from '../auth/useAuth'
import ShellErrorBoundary from '../components/ShellErrorBoundary'

export default function PanelHost() {
  const { hasPermission } = useAuth()

  return (
    <Suspense fallback={null}>
      {PANELS.filter((p) => hasPermission(p.permission)).map((p) => {
        const Panel = p.component
        return (
          // One boundary per panel — a crash in one (docked or floating)
          // must not take out its dock siblings or any other open panel.
          <ShellErrorBoundary key={p.key} kind="panel" label={`Panel "${p.title}"`} resetKey={p.key}>
            <Panel />
          </ShellErrorBoundary>
        )
      })}
    </Suspense>
  )
}
