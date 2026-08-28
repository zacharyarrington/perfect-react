// DataTable — sortable, searchable, paginated table for admin views.
//
//   <DataTable
//     columns={[
//       { key: 'name', label: 'Name', sortable: true },
//       { key: 'status', label: 'Status', render: (row) => <span className="badge">{row.status}</span> },
//     ]}
//     rows={data}
//     searchable
//     pageSize={10}
//     onRowClick={(row) => …}          // optional
//   />
//
// Sorting uses the raw row value at `key`; `render` only changes presentation.

import { useMemo, useState } from 'react'
import SearchInput from './SearchInput'
import { IconArrowUp, IconArrowDown, IconChevronLeft, IconChevronRight, IconInbox } from '@tabler/icons-react'

export default function DataTable({
  columns = [],
  rows = [],
  searchable = false,
  pageSize = 0,          // 0 = no pagination
  onRowClick,
  emptyTitle = 'No data',
  emptyDesc,
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(null)   // { key, dir: 1 | -1 }
  const [page, setPage] = useState(0)

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

  return (
    <div>
      {searchable && (
        <div style={{ marginBottom: 'var(--space-3)', maxWidth: 280 }}>
          <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(0) }} />
        </div>
      )}

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
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
                <td colSpan={columns.length}>
                  <div className="empty-state" style={{ padding: 'var(--space-5)' }}>
                    <div className="empty-state-icon"><IconInbox size={26} /></div>
                    <div className="empty-state-title">{emptyTitle}</div>
                    {emptyDesc && <div className="empty-state-desc">{emptyDesc}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : String(row[col.key] ?? '')}</td>
                  ))}
                </tr>
              ))
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
