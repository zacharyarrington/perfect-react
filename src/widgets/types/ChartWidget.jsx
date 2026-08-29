// ChartWidget — renders Bar/Line/DonutChart depending on config.variant,
// all driven by the same useWidgetData rows (dataShape 'rows').

import BarChart from '../../components/charts/BarChart'
import LineChart from '../../components/charts/LineChart'
import DonutChart from '../../components/charts/DonutChart'
import EmptyState from '../../components/ui/EmptyState'
import useWidgetData from '../useWidgetData'
import { IconDatabaseOff, IconAlertTriangle, IconChartBar } from '@tabler/icons-react'

export default function ChartWidget({ instance }) {
  const { binding, config } = instance
  const variant = config?.variant || 'bar'
  const { rows, loading, error } = useWidgetData(instance)

  const isDonut = variant === 'donut'
  const missingBinding = !binding?.sourceId || (isDonut
    ? !binding?.nameField || !binding?.valueField
    : !binding?.xField || !binding?.seriesFields?.length)

  if (missingBinding) {
    return (
      <EmptyState
        icon={<IconDatabaseOff size={26} />}
        title="No data source set"
        desc="Open this widget's settings to pick a data source and fields."
      />
    )
  }

  if (error) {
    return <EmptyState icon={<IconAlertTriangle size={26} />} title="Couldn't load data" desc={error.message} />
  }

  if (loading) {
    return <EmptyState icon={<IconChartBar size={26} />} title="Loading…" />
  }

  if (isDonut) {
    return <DonutChart data={rows} nameKey={binding.nameField} valueKey={binding.valueField} height={220} />
  }

  const series = binding.seriesFields.map((key) => ({ key, label: key }))
  if (variant === 'line') {
    return <LineChart data={rows} xKey={binding.xField} series={series} height={220} />
  }
  return <BarChart data={rows} xKey={binding.xField} series={series} stacked={config?.stacked} height={220} />
}
