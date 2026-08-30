// WidgetErrorBoundary — catches a render-time throw from one widget's type
// component (a malformed chart data shape, a third-party chart library
// choking on an edge case, etc.) and swaps in an EmptyState instead of
// taking the whole dashboard down with it.
//
// This app has no other error boundary anywhere (see PanelHost.jsx's
// unconditional-mount comment — an uncaught render error there would crash
// every panel and the whole tree, not just one). Widgets are the one place
// this actually matters: every widget's data ultimately comes from a
// provider this app doesn't fully control the shape of (an imported CSV
// with unexpected columns, a future real API returning something a chart
// type doesn't expect), so a single misbehaving widget must never be able
// to blank the rest of the dashboard. React error boundaries can only be
// class components — there's no hook equivalent.

import { Component } from 'react'
import EmptyState from '../components/ui/EmptyState'
import { IconAlertTriangle } from '@tabler/icons-react'

export default class WidgetErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surfaced nowhere else in the UI — this is the one diagnostic trail a crashed widget leaves.
    console.error(`Widget "${this.props.title || 'Untitled'}" crashed:`, error, info.componentStack)
  }

  componentDidUpdate(prevProps) {
    // Recover automatically if the widget instance is reconfigured (a
    // different sourceId/field selection is often exactly what fixes a
    // shape mismatch) rather than leaving it stuck on the crash forever.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <EmptyState
          icon={<IconAlertTriangle size={26} />}
          title="This widget crashed"
          desc={this.state.error.message || 'Try reopening its settings and checking the field mapping.'}
        />
      )
    }
    return this.props.children
  }
}
