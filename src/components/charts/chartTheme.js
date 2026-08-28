// chartTheme — shared chart styling constants.
//
// Series colors are CSS variables (--chart-1 … --chart-8, defined per theme in
// styles/index.css) so charts re-theme automatically. The palette ordering is a
// colorblind-safety mechanism (adjacent pairs validated for CVD separation):
// assign slots in order, never cycle or shuffle, and prefer <= 4 series —
// fold extras into an "Other" bucket instead of adding hues.

export const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
  'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)',
]

export const AXIS_STYLE = {
  stroke: 'var(--border-default)',
  tick: { fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-ui)' },
  tickLine: false,
  axisLine: { stroke: 'var(--border-default)' },
}

export const GRID_STYLE = {
  stroke: 'var(--border-subtle)',
  vertical: false,
}

export const LEGEND_STYLE = {
  wrapperStyle: { fontSize: 12, color: 'var(--text-secondary)', paddingTop: 8 },
  iconSize: 9,
  iconType: 'circle',
}
