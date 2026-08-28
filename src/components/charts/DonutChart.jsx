// DonutChart — themed part-of-whole donut with legend.
// Best kept to <= 4 slices; extras beyond `maxSlices` fold into "Other".
//
//   <DonutChart
//     data={[{ name: 'Direct', value: 400 }, { name: 'Referral', value: 300 }, …]}
//     height={240}
//   />

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, LEGEND_STYLE } from './chartTheme'
import ChartTooltip from './ChartTooltip'

export default function DonutChart({
  data = [], nameKey = 'name', valueKey = 'value',
  height = 240, maxSlices = 4, valueFormatter,
}) {
  // Fold small slices into "Other" instead of adding hues past the safe range
  let slices = [...data].sort((a, b) => b[valueKey] - a[valueKey])
  if (slices.length > maxSlices) {
    const kept = slices.slice(0, maxSlices - 1)
    const other = slices.slice(maxSlices - 1).reduce((sum, d) => sum + d[valueKey], 0)
    slices = [...kept, { [nameKey]: 'Other', [valueKey]: other }]
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={slices}
          dataKey={valueKey}
          nameKey={nameKey}
          innerRadius="58%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="var(--bg-surface)"
          strokeWidth={2}
        >
          {slices.map((entry, i) => (
            <Cell key={entry[nameKey]} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Legend {...LEGEND_STYLE} verticalAlign="bottom" />
      </PieChart>
    </ResponsiveContainer>
  )
}
