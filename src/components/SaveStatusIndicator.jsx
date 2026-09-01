// SaveStatusIndicator — top-bar readout of the shared save-status slice
// (useAppStore.saveState), fed by every auto-save pipeline: panels/theme/dock
// (usePersistence.js), dashboards (dashboardStorage.js), and signed-in user
// preferences/layout (userManager.js via usePersistence.js). One indicator
// for all three rather than a per-pipeline UI — see useAppStore.js's
// "Save status" slice comment.

import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { IconCloudCheck, IconCloudUp, IconCloudExclamation } from '@tabler/icons-react'

export default function SaveStatusIndicator() {
  const saveState = useAppStore((s) => s.saveState)
  const lastSavedAt = useAppStore((s) => s.lastSavedAt)
  // "Saved" is a transient confirmation, not a permanent state — fade back to
  // idle (nothing shown) a couple seconds after the write lands, same spirit
  // as the toast auto-dismiss elsewhere in the shell.
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (saveState !== 'saved') return
    setShowSaved(true)
    const t = setTimeout(() => setShowSaved(false), 2500)
    return () => clearTimeout(t)
  }, [saveState, lastSavedAt])

  if (saveState === 'saving') {
    return (
      <span className="save-status save-status-saving" data-tooltip="Saving changes…">
        <IconCloudUp size={14} />
        <span className="save-status-label">Saving…</span>
      </span>
    )
  }

  if (saveState === 'error') {
    return (
      <span className="save-status save-status-error" data-tooltip="Your last change couldn't be saved. It will keep retrying as you make further changes.">
        <IconCloudExclamation size={14} />
        <span className="save-status-label">Save failed</span>
      </span>
    )
  }

  if (showSaved) {
    return (
      <span className="save-status save-status-saved" data-tooltip="All changes saved">
        <IconCloudCheck size={14} />
        <span className="save-status-label">Saved</span>
      </span>
    )
  }

  return null
}
