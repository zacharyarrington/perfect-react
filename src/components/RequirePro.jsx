// RequirePro — wraps a feature that should only be usable on the Pro tier.
// Renders children as-is for Pro users; otherwise renders `fallback` (or a
// small default "Pro" lock badge) so free/guest users see what they're
// missing instead of the feature just silently disappearing.
import useTier from '../store/useTier'
import { IconLock } from '@tabler/icons-react'

export default function RequirePro({ children, fallback }) {
  const { isPro } = useTier()
  if (isPro) return children

  if (fallback !== undefined) return fallback

  return (
    <span className="badge badge-teal" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} data-tooltip="Upgrade to Pro to unlock this">
      <IconLock size={12} /> Pro
    </span>
  )
}
