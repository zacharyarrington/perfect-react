// DataTable — sortable, searchable, paginated table for admin views.
//
//   <DataTable
//     columns={[
//       { key: 'name', label: 'Name', sortable: true },
//       { key: 'status', label: 'Status', render: (row) => <span className="badge">{row.status}</span> },
//       { key: 'note', label: 'Note', priority: 'low' },   // hidden on phone widths
//     ]}
//     rows={data}
//     searchable
//     pageSize={10}
//     exportFilename="users"     // adds an Export CSV button
//     onRowClick={(row) => …}    // optional
//   />
//
// Sorting uses the raw row value at `key`; `render` only changes presentation.
// CSV export uses the raw value too, unless a column sets `csvValue(row)`.

import { useMemo, useState } from 'react'
import SearchInput from './SearchInput'
import { exportCsv } from './exportCsv'
import {
  IconArrowUp, IconArrowDown, IconChevronLeft, IconChevronRight,
  IconInbox, IconDownload,
} from '@tabler/icons-react'

export default function DataTable({
  columns = [],
  rows = [],
  searchable = false,
  pageSize = 0,          // 0 = no pagination
  onRowClick,
  emptyTitle = 'No data',
  emptyDesc,
  exportFilename,        // set to show an "Export CSV" button
  selectable = false,
  selected,              // Set of selected row ids (controlled)
  onSelectedChange,      // (Set) => void
  getRowId = (row, i) => row.id ?? i,
  bulkActions,           // optional: (selectedRows, clearSelection) => ReactNode, rendered above the table when >=1 selected
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(null)   // { key, dir: 1 | -1 }
  const [page, setPage] = useState(0)
  const [internalSelected, setInternalSelected] = useState(() => new Set())
  const selectedIds = selected ?? internalSelected
  // Normalizes to an updater-style setter regardless of whether selection is
  // controlled (onSelectedChange expects a plain Set) or uncontrolled (the
  // useState setter supports functional updates natively) — every caller in
  // this file can then always pass an updater fn and get the true latest
  // value, even when two updates land in the same render batch.
  const updateSelected = onSelectedChange
    ? (updater) => onSelectedChange(updater(selectedIds))
    : setInternalSelected

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((row) =>
      columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(q))
    )
  }, [rows, query, columns])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const { key, dir } = sort
    return [...filtered].sort((a, b) => {
      const av = a[key], bv = b[key]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir
    })
  }, [filtered, sort])

  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const clampedPage = Math.min(page, pageCount - 1)
  const visible = pageSize > 0
    ? sorted.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize)
    : sorted

  const toggleSort = (col) => {
    if (!col.sortable) return
    setSort((s) => {
      if (s?.key !== col.key) return { key: col.key, dir: 1 }
      if (s.dir === 1) return { key: col.key, dir: -1 }
      return null
    })
  }

  // Both toggles build the next Set from the setState updater's `prev` rather
  // than the `selectedIds` closed over by this render — two toggles fired in
  // the same tick (e.g. two checkbox clicks before React re-renders) would
  // otherwise each start from the same stale snapshot and the second call's
  // write would clobber the first's instead of accumulating.
  const toggleRow = (id) => {
    updateSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allVisibleSelected = visible.length > 0 && visible.every((row) => selectedIds.has(getRowId(row)))
  const toggleAllVisible = () => {
    updateSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visible.forEach((row) => next.delete(getRowId(row)))
      else visible.forEach((row) => next.add(getRowId(row)))
      return next
    })
  }

  const selectedRows = rows.filter((row) => selectedIds.has(getRowId(row)))
  const clearSelection = () => updateSelected(() => new Set())

  return (
    <div>
      {(searchable || exportFilename) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
          {searchable && (
            <div style={{ maxWidth: 280, flex: 1 }}>
              <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(0) }} />
            </div>
          )}
          {exportFilename && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: searchable ? 0 : 'auto' }}
              onClick={() => exportCsv(exportFilename, columns.filter((c) => c.key !== 'actions'), sorted)}
            >
              <IconDownload size={13} /> Export CSV
            </button>
          )}
        </div>
      )}

      {selectable && selectedRows.length > 0 && bulkActions && (
        <div className="table-bulk-bar">
          <span>{selectedRows.length} selected</span>
          {bulkActions(selectedRows, clearSelection)}
        </div>
      )}

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 32 }}>
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  data-col-priority={col.priority}
                  onClick={() => toggleSort(col)}
                  style={{ cursor: col.sortable ? 'pointer' : 'default', width: col.width }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {sort?.key === col.key && (sort.dir === 1 ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  <div className="empty-state" style={{ padding: 'var(--space-5)' }}>
                    <div className="empty-state-icon"><IconInbox size={26} /></div>
                    <div className="empty-state-title">{emptyTitle}</div>
                    {emptyDesc && <div className="empty-state-desc">{emptyDesc}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              visible.map((row, i) => {
                const id = getRowId(row, i)
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {selectable && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggleRow(id)} />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} data-col-priority={col.priority}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && pageCount > 1 && (
        <div className="table-pagination">
          <span>
            {clampedPage * pageSize + 1}–{Math.min((clampedPage + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-icon btn-xs"
              disabled={clampedPage === 0}
              style={{ opacity: clampedPage === 0 ? 0.35 : 1 }}
              onClick={() => setPage(clampedPage - 1)}
            >
              <IconChevronLeft size={14} />
            </button>
            <button
              className="btn btn-icon btn-xs"
              disabled={clampedPage >= pageCount - 1}
              style={{ opacity: clampedPage >= pageCount - 1 ? 0.35 : 1 }}
              onClick={() => setPage(clampedPage + 1)}
            >
              <IconChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
