// StatWidget — renders a StatCard driven by useWidgetData's aggregate
// output (see widgets.config.jsx: dataShape 'aggregate').

import StatCard from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'
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

  return (
    <StatCard
      label={instance.title || 'Value'}
      value={loading ? '…' : formatValue(value)}
      delta={delta != null ? Math.round(delta * 10) / 10 : undefined}
      invertDelta={config?.invertDelta}
    />
  )
}
