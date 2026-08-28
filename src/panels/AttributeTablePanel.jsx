import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import { evaluateRule } from '../filters/FilterBuilder'
import { computeBbox } from '../import/importManager'
import { IconTable, IconSearch, IconColumns, IconFocusCentered, IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

const PAGE_SIZE_OPTIONS = [50, 100, 250, 500]

export default function AttributeTablePanel() {
  const {
    layers, activeLayerId, updateFeatureProperty,
    selectedFeatureIds, setSelectedFeatures, setPendingFitBounds,
  } = useAppStore()

  const [sortField, setSortField]             = useState(null)
  const [sortDir, setSortDir]                 = useState('asc')
  const [filterText, setFilterText]           = useState('')
  const [editCell, setEditCell]               = useState(null)
  const [editValue, setEditValue]             = useState('')
  const [layerTabId, setLayerTabId]           = useState(null)
  const [colOrder, setColOrder]               = useState([])
  const [hiddenCols, setHiddenCols]           = useState(new Set())
  const [showColMenu, setShowColMenu]         = useState(false)
  const [dragColIdx, setDragColIdx]           = useState(null)
  const [dragOverColIdx, setDragOverColIdx]   = useState(null)
  const [lastSelectedIdx, setLastSelectedIdx] = useState(null)
  const [page, setPage]                       = useState(0)
  const [pageSize, setPageSize]               = useState(100)

  const selectAllRef  = useRef(null)
  const colMenuRef    = useRef(null)
  const tableBodyRef  = useRef(null)
  const selectedRowRef = useRef(null)

  const displayLayerId = layerTabId || activeLayerId
  const layer = useMemo(
    () => layers.find((l) => l.id === displayLayerId),
    [layers, displayLayerId]
  )

  const allFields = useMemo(() => {
    if (!layer?.geojson?.features?.length) return []
    const keys = new Set()
    for (const f of layer.geojson.features) {
      Object.keys(f.properties || {}).forEach((k) => keys.add(k))
    }
    return ['_idx', ...keys]
  }, [layer])

  // Reset column config and page when switching layers
  useEffect(() => {
    setColOrder(allFields)
    setHiddenCols(new Set())
    setLastSelectedIdx(null)
    setPage(0)
  }, [displayLayerId]) // eslint-disable-line

  // Append any new fields that appear after the initial load (e.g. after cell edits)
  useEffect(() => {
    if (!allFields.length) return
    setColOrder((prev) => {
      const missing = allFields.filter((f) => !prev.includes(f))
      return missing.length ? [...prev, ...missing] : prev
    })
  }, [allFields])

  // Close column menu on outside click
  useEffect(() => {
    if (!showColMenu) return
    const handler = (e) => {
      if (!colMenuRef.current?.contains(e.target)) setShowColMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColMenu])

  // Ordered visible columns
  const visibleFields = useMemo(() => {
    const ordered = colOrder.filter((f) => allFields.includes(f) && !hiddenCols.has(f))
    const extra   = allFields.filter((f) => !colOrder.includes(f) && !hiddenCols.has(f))
    return [...ordered, ...extra]
  }, [allFields, colOrder, hiddenCols])

  const rows = useMemo(() => {
    if (!layer?.geojson?.features) return []
    let result = layer.geojson.features.map((f, i) => ({
      _idx: i + 1, ...f.properties, __featureIndex: i,
    }))

    if (layer.filters?.length > 0) {
      const logic = layer.filters[0]?.groupLogic || 'all'
      result = result.filter((row) => {
        const props = layer.geojson.features[row.__featureIndex]?.properties || {}
        return logic === 'or'
          ? layer.filters.some((rule) => evaluateRule(rule, props))
          : layer.filters.every((rule) => evaluateRule(rule, props))
      })
    }

    if (filterText) {
      const q = filterText.toLowerCase()
      result = result.filter((r) =>
        Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
      )
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        const va = a[sortField] ?? ''
        const vb = b[sortField] ?? ''
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [layer, filterText, sortField, sortDir])

  // Reset to page 0 whenever the filtered/sorted result set changes
  const prevRowCountRef = useRef(rows.length)
  useEffect(() => {
    if (rows.length !== prevRowCountRef.current) {
      setPage(0)
      prevRowCountRef.current = rows.length
    }
  }, [rows.length])

  // Auto-navigate to and scroll the first selected row into view when selection changes from outside
  const prevSelectedRef = useRef(selectedFeatureIds)
  useEffect(() => {
    const prev = prevSelectedRef.current
    prevSelectedRef.current = selectedFeatureIds

    // Only act when selection was changed externally (different reference, and something is selected in this layer)
    if (selectedFeatureIds === prev) return
    const sel = selectedFeatureIds.filter((s) => s.layerId === displayLayerId)
    if (!sel.length) return

    const firstFeatureIndex = sel[0].featureIndex
    const rowIdx = rows.findIndex((r) => r.__featureIndex === firstFeatureIndex)
    if (rowIdx === -1) return

    const targetPage = Math.floor(rowIdx / pageSize)
    setPage(targetPage)

    // Scroll the row into view after the page renders
    requestAnimationFrame(() => {
      selectedRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [selectedFeatureIds]) // eslint-disable-line

  const totalPages  = Math.max(1, Math.ceil(rows.length / pageSize))
  const clampedPage = Math.min(page, totalPages - 1)
  const pageStart   = clampedPage * pageSize
  const pageRows    = rows.slice(pageStart, pageStart + pageSize)

  // ── Selection ──────────────────────────────────────────────────────────────

  const selectedInLayer = selectedFeatureIds.filter((s) => s.layerId === displayLayerId)
  const isRowSelected   = (fi) => selectedInLayer.some((s) => s.featureIndex === fi)
  const allSelected     = rows.length > 0 && rows.every((r) => isRowSelected(r.__featureIndex))
  const someSelected    = rows.some((r) => isRowSelected(r.__featureIndex))

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected
    }
  }, [someSelected, allSelected])

  const handleSelectAll = () => {
    const others = selectedFeatureIds.filter((s) => s.layerId !== displayLayerId)
    if (allSelected) {
      setSelectedFeatures(others)
    } else {
      setSelectedFeatures([
        ...others,
        ...rows.map((r) => ({ layerId: displayLayerId, featureIndex: r.__featureIndex })),
      ])
    }
  }

  const handleRowClick = (row, e) => {
    const fi          = row.__featureIndex
    const rowIdxInTable = rows.findIndex((r) => r.__featureIndex === fi)

    if (e.shiftKey && lastSelectedIdx !== null) {
      const lastIdx  = rows.findIndex((r) => r.__featureIndex === lastSelectedIdx)
      const [from, to] = [Math.min(lastIdx, rowIdxInTable), Math.max(lastIdx, rowIdxInTable)]
      const range = rows.slice(from, to + 1).map((r) => ({ layerId: displayLayerId, featureIndex: r.__featureIndex }))
      const others = selectedFeatureIds.filter((s) => s.layerId !== displayLayerId)
      setSelectedFeatures([...others, ...range])
    } else if (e.ctrlKey || e.metaKey) {
      if (isRowSelected(fi)) {
        setSelectedFeatures(selectedFeatureIds.filter((s) => !(s.layerId === displayLayerId && s.featureIndex === fi)))
      } else {
        setSelectedFeatures([...selectedFeatureIds, { layerId: displayLayerId, featureIndex: fi }])
      }
      setLastSelectedIdx(fi)
    } else {
      setSelectedFeatures([{ layerId: displayLayerId, featureIndex: fi }])
      setLastSelectedIdx(fi)
    }
  }

  const handleCheckboxChange = (row, checked) => {
    if (checked) {
      setSelectedFeatures([...selectedFeatureIds, { layerId: displayLayerId, featureIndex: row.__featureIndex }])
    } else {
      setSelectedFeatures(selectedFeatureIds.filter((s) => !(s.layerId === displayLayerId && s.featureIndex === row.__featureIndex)))
    }
    setLastSelectedIdx(row.__featureIndex)
  }

  // ── Zoom to selected ───────────────────────────────────────────────────────

  const zoomToSelected = () => {
    if (!selectedInLayer.length || !layer) return
    const features = selectedInLayer.map((s) => layer.geojson.features[s.featureIndex]).filter(Boolean)
    const bbox = computeBbox({ type: 'FeatureCollection', features })
    if (!bbox) return
    const [w, s, e, n] = bbox
    const pad = w === e && s === n ? 0.02 : 0
    setPendingFitBounds([w - pad, s - pad, e + pad, n + pad])
  }

  // ── Sorting ────────────────────────────────────────────────────────────────

  const handleSort = (field) => {
    if (field === '_idx') return
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  // ── Cell editing ──────────────────────────────────────────────────────────

  const commitEdit = () => {
    if (!editCell || !layer) return
    updateFeatureProperty(layer.id, editCell.rowIdx, editCell.field, editValue)
    setEditCell(null)
  }

  // ── Column reorder ────────────────────────────────────────────────────────

  const handleColReorder = (fromIdx, toIdx) => {
    const newVisible = [...visibleFields]
    const [moved] = newVisible.splice(fromIdx, 1)
    newVisible.splice(toIdx, 0, moved)
    const hidden = colOrder.filter((f) => hiddenCols.has(f))
    setColOrder([...newVisible, ...hidden])
  }

  const toggleColVisibility = (field) => {
    setHiddenCols((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <FloatingPanel
      panelKey="attributes"
      title="Attribute Table"
      icon={<IconTable size={16} />}
      defaultWidth={680}
      defaultHeight={300}
      minWidth={400}
      minHeight={150}
    >
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>

        {/* Layer tabs */}
        <div style={{ display: 'flex', gap: 4, flex: 1, overflow: 'auto', minWidth: 0 }}>
          {layers.map((l) => (
            <button
              key={l.id}
              className={`tab-btn${(layerTabId || activeLayerId) === l.id ? ' active' : ''}`}
              onClick={() => setLayerTabId(l.id)}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span style={{ width: 8, height: 8, background: l.style?.color || '#888', borderRadius: '50%', display: 'inline-block', marginRight: 5 }} />
              {l.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <IconSearch size={13} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="input input-sm"
            style={{ width: 150, paddingLeft: 24, paddingRight: filterText ? 22 : undefined }}
            placeholder="Search…"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {filterText && (
            <button
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
              onClick={() => setFilterText('')}
            >
              <IconX size={12} />
            </button>
          )}
        </div>

        {/* Column visibility */}
        <div style={{ position: 'relative', flexShrink: 0 }} ref={colMenuRef}>
          <button
            className={`btn btn-icon btn-sm${showColMenu ? ' active' : ''}`}
            data-tooltip="Show / hide columns"
            onClick={() => setShowColMenu((v) => !v)}
          >
            <IconColumns size={15} />
          </button>

          {showColMenu && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: 8, padding: '4px 0', zIndex: 300,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 180, maxHeight: 240, overflowY: 'auto',
            }}>
              <div style={{ padding: '4px 12px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Columns
              </div>
              {allFields.filter((f) => f !== '_idx').map((f) => (
                <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={!hiddenCols.has(f)}
                    onChange={() => toggleColVisibility(f)}
                  />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Selection controls — only visible when something is selected */}
        {someSelected && (
          <>
            <span style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {selectedInLayer.length} selected
            </span>
            <button
              className="btn btn-icon btn-sm"
              data-tooltip="Zoom to selected"
              onClick={zoomToSelected}
            >
              <IconFocusCentered size={15} />
            </button>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setSelectedFeatures(selectedFeatureIds.filter((s) => s.layerId !== displayLayerId))}
            >
              Clear
            </button>
          </>
        )}

        {/* Row count */}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {rows.length} / {layer?.geojson?.features?.length || 0}
        </span>
      </div>

      {/* Table */}
      {!layer ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconTable size={32} /></div>
          <div className="empty-state-title">No layer selected</div>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconSearch size={32} /></div>
          <div className="empty-state-title">No matching rows</div>
        </div>
      ) : (
        <div className="attr-table-wrapper" style={{ flex: 1 }}>
          <table className="attr-table">
            <thead>
              <tr>
                {/* Select-all */}
                <th style={{ width: 32, padding: '0 8px', textAlign: 'center', cursor: 'default' }}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    title={allSelected ? 'Deselect all' : 'Select all'}
                  />
                </th>

                {visibleFields.map((field, visIdx) => (
                  <th
                    key={field}
                    draggable={field !== '_idx'}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragColIdx(visIdx) }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverColIdx(visIdx) }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragColIdx !== null && dragColIdx !== visIdx) handleColReorder(dragColIdx, visIdx)
                      setDragColIdx(null); setDragOverColIdx(null)
                    }}
                    onDragEnd={() => { setDragColIdx(null); setDragOverColIdx(null) }}
                    onClick={() => handleSort(field)}
                    className={sortField === field ? 'sorted' : ''}
                    style={{
                      cursor: field !== '_idx' ? 'grab' : 'default',
                      userSelect: 'none',
                      opacity: dragColIdx === visIdx ? 0.4 : 1,
                      borderLeft: dragOverColIdx === visIdx && dragColIdx !== visIdx && dragColIdx !== null
                        ? '2px solid var(--accent-primary)' : undefined,
                    }}
                  >
                    {field === '_idx' ? '#' : field}
                    {sortField === field && (
                      <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody ref={tableBodyRef}>
              {pageRows.map((row) => {
                const selected = isRowSelected(row.__featureIndex)
                const isFirstSelected = selected && selectedFeatureIds.find((s) => s.layerId === displayLayerId)?.featureIndex === row.__featureIndex
                return (
                  <tr
                    key={row.__featureIndex}
                    ref={isFirstSelected ? selectedRowRef : null}
                    className={selected ? 'selected' : ''}
                    onClick={(e) => handleRowClick(row, e)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Row checkbox */}
                    <td
                      style={{ textAlign: 'center', padding: '0 8px' }}
                      onClick={(e) => { e.stopPropagation(); handleCheckboxChange(row, !selected) }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {}}
                        style={{ pointerEvents: 'none' }}
                      />
                    </td>

                    {visibleFields.map((field) => (
                      <td
                        key={field}
                        onDoubleClick={() => {
                          if (field === '_idx') return
                          setEditCell({ rowIdx: row.__featureIndex, field })
                          setEditValue(String(row[field] ?? ''))
                        }}
                      >
                        {editCell?.rowIdx === row.__featureIndex && editCell?.field === field ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit()
                              if (e.key === 'Escape') setEditCell(null)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span title={String(row[field] ?? '')}>
                            {row[field] === null || row[field] === undefined
                              ? <em style={{ color: 'var(--text-muted)' }}>null</em>
                              : String(row[field])}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination footer */}
      {rows.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 10px',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0,
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}>
          {/* Prev */}
          <button
            className="btn btn-icon btn-xs"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clampedPage === 0}
            style={{ opacity: clampedPage === 0 ? 0.35 : 1 }}
          >
            <IconChevronLeft size={13} />
          </button>

          {/* Page indicator */}
          <span style={{ whiteSpace: 'nowrap' }}>
            Page <strong>{clampedPage + 1}</strong> of <strong>{totalPages}</strong>
          </span>

          {/* Next */}
          <button
            className="btn btn-icon btn-xs"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={clampedPage >= totalPages - 1}
            style={{ opacity: clampedPage >= totalPages - 1 ? 0.35 : 1 }}
          >
            <IconChevronRight size={13} />
          </button>

          {/* Row range */}
          <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {pageStart + 1}–{Math.min(pageStart + pageSize, rows.length)} of {rows.length}
          </span>

          <div style={{ flex: 1 }} />

          {/* Page size picker */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Rows
            <select
              className="select"
              style={{ padding: '1px 4px', fontSize: 11, height: 22, minWidth: 60 }}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </FloatingPanel>
  )
}
