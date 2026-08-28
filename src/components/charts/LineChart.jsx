// LineChart — themed line chart with crosshair tooltip.
//
//   <LineChart
//     data={[{ day: 'Mon', visits: 240, signups: 12 }, …]}
//     xKey="day"
//     series={[{ key: 'visits', label: 'Visits' }, { key: 'signups', label: 'Signups' }]}
//     height={260}
//   />

import {
  LineChart as RLineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE } from './chartTheme'
import ChartTooltip from './ChartTooltip'

export default function LineChart({
  data = [], xKey, series = [],
  height = 260, valueFormatter,
}) {
  const multi = series.length > 1

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} />
        <Tooltip
          cursor={{ stroke: 'var(--border-default)', strokeDasharray: '3 3' }}
          content={<ChartTooltip valueFormatter={valueFormatter} />}
        />
        {multi && <Legend {...LEGEND_STYLE} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.label || s.key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--bg-surface)' }}
          />
        ))}
      </RLineChart>
    </ResponsiveContainer>
  )
}
