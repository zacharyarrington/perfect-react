import { useEffect, useRef, useState, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import './styles/index.css'

import APP_CONFIG from './config/app.config'
import PAGES from './config/pages.config'
import PANELS from './config/panels.config'

import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import PanelHost from './panels/PanelHost'
import Dock from './panels/Dock'
import LoginDialog from './auth/LoginDialog'
import RequirePermission from './auth/RequirePermission'
import NotFoundPage from './pages/NotFoundPage'
import CommandPalette from './command/CommandPalette'
import ShellErrorBoundary from './components/ShellErrorBoundary'
import OnboardingBanner from './components/OnboardingBanner'

import useAppStore from './store/useAppStore'
import usePersistence from './store/usePersistence'
import { isFirstLoginPrompt, getActiveUserId } from './auth/userManager'
import { initDashboardStorage } from './dashboards/dashboardStorage'

// Panel keys that get Cmd/Ctrl+1…9 shortcuts, in registry order
const SHORTCUT_PANEL_KEYS = PANELS.filter((p) => p.showToggle).slice(0, 9).map((p) => p.key)

// Module-level guard so StrictMode's double effect-run in dev can't
// double-seed a default dashboard.
let dashboardStorageInitRan = false

export default function App() {
  usePersistence()

  const { theme, clampPanels, showLoginDialog, setShowLoginDialog } = useAppStore()
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
  )
  const contentRef = useRef(null)

  // 'auto' follows the OS preference
  const resolvedTheme = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Load dashboards (or seed a default one) and wire up auto-save
  useEffect(() => {
    if (dashboardStorageInitRan) return
    dashboardStorageInitRan = true
    initDashboardStorage()
  }, [])

  // Apply theme attribute to <html> so CSS variables cascade everywhere
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  // Keep panels inside the content area when it resizes
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        clampPanels(width, height)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [clampPanels])

  // First visit (or guests disabled): prompt for a user
  useEffect(() => {
    if (getActiveUserId()) return
    if (!APP_CONFIG.allowGuest || isFirstLoginPrompt()) {
      const t = setTimeout(() => setShowLoginDialog(true), 400)
      return () => clearTimeout(t)
    }
  }, [setShowLoginDialog])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
        || document.activeElement?.isContentEditable
      if (inInput) return

      const mod = e.ctrlKey || e.metaKey
      const store = useAppStore.getState()

      // Ctrl/Cmd+1–9 → activate panels (registry order) — routes to the dock
      // or floats it, whichever the panel is currently set to
      if (mod && e.key >= '1' && e.key <= '9') {
        const key = SHORTCUT_PANEL_KEYS[parseInt(e.key, 10) - 1]
        if (key) {
          e.preventDefault()
          store.activatePanel(key)
        }
        return
      }

      // Ctrl/Cmd+B → collapse/expand sidebar
      if (mod && e.key === 'b') {
        e.preventDefault()
        store.toggleSidebar()
        return
      }

      // Ctrl/Cmd+D → collapse/expand the dock rail
      if (mod && e.key === 'd') {
        e.preventDefault()
        store.toggleDock()
        return
      }

      // Ctrl/Cmd+` → toggle all panels
      if (mod && e.key === '`') {
        e.preventDefault()
        const openKeys = Object.entries(store.panels).filter(([, p]) => p.open).map(([k]) => k)
        if (openKeys.length > 0) {
          store.closeAllPanels()
        } else {
          SHORTCUT_PANEL_KEYS.forEach((k) => store.activatePanel(k))
        }
        return
      }

      if (mod) return

      // Escape → close all open panels
      if (e.key === 'Escape') {
        const anyOpen = Object.values(store.panels).some((p) => p.open)
        if (anyOpen) {
          e.preventDefault()
          store.closeAllPanels()
        }
        return
      }

      // T → cycle theme
      if (e.key === 't') {
        const t = store.theme
        store.setTheme(t === 'auto' ? 'dark' : t === 'dark' ? 'light' : 'auto')
        return
      }

      // ? → keyboard shortcuts panel
      if (e.key === '?') {
        store.togglePanel('keybindings')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    // AntD default theme, unwired to the app's own dark/light toggle for now
    // (theme === 'auto' | 'dark' | 'light' above only drives the hand-rolled
    // CSS variables via data-theme). AntD components will render in AntD's
    // light theme regardless of that toggle until someone deliberately maps
    // resolvedTheme -> ConfigProvider's algorithm (theme.darkAlgorithm).
    <ConfigProvider>
      <div className="app-container">
        <TopBar />
        <OnboardingBanner />
        <div className="app-body">
          <Sidebar />
          <main ref={contentRef} className="page-container">
            <div className="page-scroll">
              <Suspense fallback={null}>
                <Routes>
                  {PAGES.map((page) => {
                    const Page = page.component
                    return (
                      <Route
                        key={page.path}
                        path={page.path}
                        element={
                          <RequirePermission permission={page.permission}>
                            <ShellErrorBoundary kind="page" label={`Page "${page.title}"`} resetKey={page.path}>
                              <Page />
                            </ShellErrorBoundary>
                          </RequirePermission>
                        }
                      />
                    )
                  })}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </div>
            {/* Floating panels live inside the content area, above the page */}
            <PanelHost />
          </main>
          <Dock />
        </div>
        <Toast />
        <CommandPalette />
        {showLoginDialog && <LoginDialog />}
      </div>
    </ConfigProvider>
  )
}
