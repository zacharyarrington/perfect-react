// ShellErrorBoundary — catches a render-time throw from one page or one
// floating/docked panel and swaps in an EmptyState instead of taking the
// whole shell down with it.
//
// Mirrors widgets/WidgetErrorBoundary.jsx's approach (see that file's
// comment for the full rationale — React error boundaries can only be class
// components, there's no hook equivalent) at the two other spots this app
// renders arbitrary, developer-authored content it doesn't fully control:
// a routed page (App.jsx) and a panel component (PanelHost.jsx). Before
// this, an uncaught render error in either place took out the whole tree —
// sidebar, top bar, and every other open panel included — since nothing
// upstream of them was a boundary.
//
// `resetKey` mirrors the widget boundary's recovery mechanism: pass
// something that changes when the crashed content might now render
// cleanly (a route pathname for a page, a panel key for a panel) so the
// error doesn't stick around forever once its cause is gone.

import { Component } from 'react'
import EmptyState from './ui/EmptyState'
import { IconAlertTriangle } from '@tabler/icons-react'

export default class ShellErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surfaced nowhere else in the UI — this is the one diagnostic trail a crash leaves.
    console.error(`${this.props.label || 'Something'} crashed:`, error, info.componentStack)
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <EmptyState
          icon={<IconAlertTriangle size={26} />}
          title={`This ${this.props.kind || 'content'} crashed`}
          desc={this.state.error.message || 'Something went wrong rendering this — the rest of the app is unaffected.'}
        />
      )
    }
    return this.props.children
  }
}
