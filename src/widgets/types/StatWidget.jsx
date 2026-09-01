// StatWidget — renders a StatCard driven by useWidgetData's aggregate
// output (see widgets.config.jsx: dataShape 'aggregate').

import StatCard from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import useWidgetData from '../useWidgetData'
import { IconDatabaseOff, IconAlertTriangle } from '@tabler/icons-react'

function formatValue(value) {
  if (value == null) return '—'
  if (Number.isInteger(value)) return value.toLocaleString()
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export default function StatWidget({ instance }) {
  const { binding, config } = instance
  const { value, delta, loading, error } = useWidgetData(instance)

  if (!binding?.sourceId || !binding?.valueField) {
    return (
      <EmptyState
        icon={<IconDatabaseOff size={26} />}
        title="No data source set"
        desc="Open this widget's settings to pick a data source and value field."
      />
    )
  }

  if (error) {
    return <EmptyState icon={<IconAlertTriangle size={26} />} title="Couldn't load data" desc={error.message} />
  }

  // Full skeleton only on first load (no value yet) — a refresh/poll tick
  // also sets loading true but keeps the previous value in place, so
  // re-skeletonizing then would blank out perfectly good stale data every
  // refreshInterval tick instead of just quietly updating in place.
  if (loading && value == null) {
    return <Skeleton.Stat />
  }

  return (
    <StatCard
      label={instance.title || 'Value'}
      value={formatValue(value)}
      delta={delta != null ? Math.round(delta * 10) / 10 : undefined}
      invertDelta={config?.invertDelta}
    />
  )
}
