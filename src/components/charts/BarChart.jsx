// BarChart — themed vertical bar chart (grouped or stacked).
//
//   <BarChart
//     data={[{ month: 'Jan', signups: 120, churn: 12 }, …]}
//     xKey="month"
//     series={[{ key: 'signups', label: 'Signups' }, { key: 'churn', label: 'Churn' }]}
//     stacked
//     height={260}
//   />

import {
  BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE } from './chartTheme'
import ChartTooltip from './ChartTooltip'

export default function BarChart({
  data = [], xKey, series = [], stacked = false,
  height = 260, valueFormatter,
}) {
  const multi = series.length > 1

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} barCategoryGap="28%" barGap={2} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} />
        <Tooltip
          cursor={{ fill: 'var(--bg-hover)', opacity: 0.5 }}
          content={<ChartTooltip valueFormatter={valueFormatter} />}
        />
        {multi && <Legend {...LEGEND_STYLE} />}
        {series.map((s, i) => {
          const isLast = i === series.length - 1
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label || s.key}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              stackId={stacked ? 'stack' : undefined}
              // Rounded data-end on the outermost segment only; baseline stays square
              radius={!stacked || isLast ? [4, 4, 0, 0] : 0}
              // 2px surface gap between stacked segments
              stroke={stacked ? 'var(--bg-surface)' : undefined}
              strokeWidth={stacked ? 1 : 0}
              maxBarSize={42}
            />
          )
        })}
      </RBarChart>
    </ResponsiveContainer>
  )
}
