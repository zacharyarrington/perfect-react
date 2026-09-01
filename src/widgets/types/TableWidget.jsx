// TableWidget — renders DataTable driven by useWidgetData rows.
// binding.columns is an explicit column subset; [] (the default) shows
// every field the source reports.

import DataTable from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import useWidgetData from '../useWidgetData'
import { IconDatabaseOff, IconAlertTriangle } from '@tabler/icons-react'

export default function TableWidget({ instance }) {
  const { binding, config } = instance
  const { rows, fields, loading, error } = useWidgetData(instance)

  if (!binding?.sourceId) {
    return (
      <EmptyState
        icon={<IconDatabaseOff size={26} />}
        title="No data source set"
        desc="Open this widget's settings to pick a data source."
      />
    )
  }

  if (error) {
    return <EmptyState icon={<IconAlertTriangle size={26} />} title="Couldn't load data" desc={error.message} />
  }

  // Full skeleton only on first load — a refresh/poll tick also sets loading
  // true but keeps the previous rows in place (see useWidgetData.js), so
  // re-skeletonizing then would blank a perfectly good table on every
  // refreshInterval tick instead of quietly updating in place.
  if (loading && rows.length === 0) {
    return <Skeleton.Table rows={4} cols={4} />
  }

  const activeFields = binding.columns?.length
    ? fields.filter((f) => binding.columns.includes(f.key))
    : fields

  return (
    <DataTable
      columns={activeFields.map((f) => ({ key: f.key, label: f.label, sortable: true }))}
      rows={rows}
      searchable={config?.searchable}
      emptyTitle="No rows"
    />
  )
}
