// OnboardingBanner — a dismissible "you just cloned this" notice pointing a
// new developer at app.config.jsx and the README's redeploy checklist.
//
// Distinct from the login dialog: that's about who's using the app, this is
// about whether it's still running under its template defaults. Dismissal
// is a plain per-browser localStorage flag, same category and pattern as
// userManager.js's isFirstLoginPrompt/markLoginPrompted (device-local
// "have I seen this" state — no reason to round-trip it through the zustand
// store or IndexedDB).
//
// Gated by APP_CONFIG.showCloneBanner, so it can be turned off entirely
// once a clone has been made someone's own, without touching this file.

import { useState } from 'react'
import APP_CONFIG from '../config/app.config'
import { IconSparkles, IconX } from '@tabler/icons-react'

const DISMISSED_KEY = 'appshell_clone_banner_dismissed'

function isDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false // storage unavailable — fail open, just show the banner
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // best-effort only — worst case it reappears next visit
  }
}

export default function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(isDismissed)

  if (!APP_CONFIG.showCloneBanner || dismissed) return null

  return (
    <div className="onboarding-banner">
      <IconSparkles size={16} className="onboarding-banner-icon" />
      <span className="onboarding-banner-text">
        This is <strong>{APP_CONFIG.name}</strong>, running on Admin Shell's template defaults.
        Start in <code>src/config/app.config.jsx</code> — the README's "Redeploy checklist" covers the rest.
      </span>
      <button
        className="onboarding-banner-close"
        onClick={() => { dismiss(); setDismissed(true) }}
        title="Dismiss"
        aria-label="Dismiss"
      >
        <IconX size={14} />
      </button>
    </div>
  )
}
