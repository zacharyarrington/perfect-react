// TableWidget — renders DataTable driven by useWidgetData rows.
// binding.columns is an explicit column subset; [] (the default) shows
// every field the source reports.

import DataTable from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
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

  const activeFields = binding.columns?.length
    ? fields.filter((f) => binding.columns.includes(f.key))
    : fields

  return (
    <DataTable
      columns={activeFields.map((f) => ({ key: f.key, label: f.label, sortable: true }))}
      rows={rows}
      searchable={config?.searchable}
      emptyTitle={loading ? 'Loading…' : 'No rows'}
    />
  )
}
