// exportCsv — tiny CSV export helper for DataTable and anywhere else a list
// of objects needs to leave the browser as a file.

function csvEscape(value) {
  const str = String(value ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

/**
 * Downloads `rows` as a CSV file. `columns` is [{ key, label }] — pass the
 * same shape DataTable uses; `render` is ignored (CSV wants raw values, use
 * `csvValue` on a column to override what's exported for that key).
 */
export function exportCsv(filename, columns, rows) {
  const header = columns.map((c) => csvEscape(c.label ?? c.key)).join(',')
  const lines = rows.map((row) =>
    columns.map((c) => csvEscape(c.csvValue ? c.csvValue(row) : row[c.key])).join(',')
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
