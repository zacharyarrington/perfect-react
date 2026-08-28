import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import FloatingPanel from './FloatingPanel'
import SymbologyMenu from './SymbologyMenu'
import CoordinateColumnDialog from '../components/CoordinateColumnDialog'
import useAppStore from '../store/useAppStore'
import { ACCEPT_STRING } from '../import/importManager'
import useFileImport from '../import/useFileImport'
import {
  IconMap, IconStack2, IconPlus,
  IconEye, IconEyeOff, IconPalette, IconTrash, IconCopy,
  IconMapPin, IconLine, IconPolygon, IconFileExport, IconPencil, IconZoomIn,
  IconMaximize, IconRefresh, IconPackageExport, IconX, IconCheck,
} from '@tabler/icons-react'
import * as turf from '@turf/turf'
import { exportGeoJSON, exportCSV, exportKML } from '../export/exportManager'
import KmlSettingsForm from '../components/KmlSettingsForm'

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '7px 12px',
  background: 'none',
  border: 'none',
  color: 'var(--text-primary)',
  fontSize: 13,
  cursor: 'pointer',
  textAlign: 'left',
}

const DRAW_TYPES = [
  {
    mode: 'draw_point',
    icon: <IconMapPin size={28} />,
    label: 'Point',
    desc: 'Place individual point features on the map',
  },
  {
    mode: 'draw_line_string',
    icon: <IconLine size={28} />,
    label: 'Line',
    desc: 'Draw connected line features on the map',
  },
  {
    mode: 'draw_polygon',
    icon: <IconPolygon size={28} />,
    label: 'Polygon',
    desc: 'Draw filled polygon features on the map',
  },
]

export default function LayerPanel() {
  const {
    layers, activeLayerId, setActiveLayer, updateLayer, removeLayer,
    reorderLayers, addLayer, addToast, duplicateLayer,
    drawMode, setDrawMode, setDrawTargetLayer,
    editLayerId, setEditLayer,
    openPanel, setPendingFitBounds, triggerMapRefresh,
    kmlExportSettings,
  } = useAppStore()

  const [draggingIdx, setDraggingIdx]     = useState(null)
  const [dragOverIdx, setDragOverIdx]     = useState(null)
  const [editingId, setEditingId]         = useState(null)
  const [editingName, setEditingName]     = useState('')
  const [symbologyOpenId, setSymbologyOpenId] = useState(null)
  const [symbologyAnchor, setSymbologyAnchor] = useState(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [contextMenu, setContextMenu]     = useState(null) // { layerId, x, y }
  const [showBulkExport, setShowBulkExport] = useState(false)
  const [bulkSelected, setBulkSelected]   = useState({}) // layerId → bool
  const [bulkFormat, setBulkFormat]       = useState('geojson')
  const [bulkFanOut, setBulkFanOut]       = useState('none')
  const [bulkFanField, setBulkFanField]   = useState('')
  const [checkedLayers, setCheckedLayers] = useState({}) // layerId → bool — layer list selection
  const [showAddMenu, setShowAddMenu]     = useState(false)
  const addMenuRef    = useRef(null)
  const addBtnRef     = useRef(null)
  const fileInputRef  = useRef(null)
  const dragRef       = useRef(false)
  const selectAllRef  = useRef(null)

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  // Indeterminate state for the select-all checkbox
  const checkedIds   = layers.filter((l) => checkedLayers[l.id])
  const allChecked   = layers.length > 0 && checkedIds.length === layers.length
  const someChecked  = checkedIds.length > 0 && !allChecked
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someChecked
  }, [someChecked])

  // Remove stale checked entries when layers are deleted
  useEffect(() => {
    const layerIds = new Set(layers.map((l) => l.id))
    setCheckedLayers((prev) => {
      const next = { ...prev }
      let changed = false
      for (const id of Object.keys(next)) {
        if (!layerIds.has(id)) { delete next[id]; changed = true }
      }
      return changed ? next : prev
    })
  }, [layers])

  const toggleChecked = (id) =>
    setCheckedLayers((prev) => ({ ...prev, [id]: !prev[id] }))

  const handleSelectAll = () => {
    if (allChecked) {
      setCheckedLayers({})
    } else {
      setCheckedLayers(Object.fromEntries(layers.map((l) => [l.id, true])))
    }
  }

  // Close Add menu on outside click
  useEffect(() => {
    if (!showAddMenu) return
    const handler = (e) => {
      if (!addMenuRef.current?.contains(e.target) && !addBtnRef.current?.contains(e.target)) {
        setShowAddMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAddMenu])

  const handleContextMenu = (e, layer) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ layerId: layer.id, x: e.clientX, y: e.clientY })
  }

  const handleOpenExportPanel = (layerId) => {
    setActiveLayer(layerId)
    openPanel('export')
    closeContextMenu()
  }

  const handleZoomToLayer = (layer) => {
    if (!layer?.geojson?.features?.length) {
      addToast({ type: 'warning', message: 'Layer has no features to zoom to' })
      closeContextMenu()
      return
    }
    try {
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(layer.geojson)
      setPendingFitBounds([minLng, minLat, maxLng, maxLat])
    } catch {
      addToast({ type: 'error', message: 'Could not compute layer extent' })
    }
    closeContextMenu()
  }

  const handleZoomToExtents = () => {
    const visible = layers.filter((l) => l.visible !== false && l.geojson?.features?.length)
    if (!visible.length) { addToast({ type: 'warning', message: 'No visible layers to zoom to' }); return }
    try {
      const combined = turf.featureCollection(visible.flatMap((l) => l.geojson.features))
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(combined)
      setPendingFitBounds([minLng, minLat, maxLng, maxLat])
    } catch {
      addToast({ type: 'error', message: 'Could not compute combined extent' })
    }
  }

  const handleDeleteSelected = () => {
    const toDelete = layers.filter((l) => checkedLayers[l.id])
    if (!toDelete.length) return
    if (window.confirm(`Remove ${toDelete.length} selected layer${toDelete.length !== 1 ? 's' : ''}?`)) {
      toDelete.forEach((l) => removeLayer(l.id))
      setCheckedLayers({})
    }
  }

  const handleBulkExport = () => {
    const selected = layers.filter((l) => bulkSelected[l.id])
    if (!selected.length) { addToast({ type: 'warning', message: 'Select at least one layer to export' }); return }

    const doExport = (layer, nameOverride) => {
      const exportLayer = nameOverride ? { ...layer, name: nameOverride } : layer
      if (bulkFormat === 'geojson') exportGeoJSON(exportLayer)
      else if (bulkFormat === 'csv') exportCSV(exportLayer)
      else if (bulkFormat === 'kml') exportKML(exportLayer, kmlExportSettings)
    }

    for (const layer of selected) {
      if (bulkFanOut === 'field' && bulkFanField) {
        const groups = {}
        for (const f of layer.geojson.features) {
          const val = String(f.properties?.[bulkFanField] ?? 'unknown')
          if (!groups[val]) groups[val] = []
          groups[val].push(f)
        }
        for (const [val, features] of Object.entries(groups)) {
          doExport({ ...layer, name: `${layer.name}_${val}`, geojson: { type: 'FeatureCollection', features } })
        }
      } else {
        doExport(layer)
      }
    }

    addToast({ type: 'success', message: `Exported ${selected.length} layer${selected.length !== 1 ? 's' : ''}` })
    setShowBulkExport(false)
  }

  const bulkFields = (() => {
    const keys = new Set()
    layers.filter((l) => bulkSelected[l.id]).forEach((l) =>
      l.geojson?.features?.forEach((f) => Object.keys(f.properties || {}).forEach((k) => keys.add(k)))
    )
    return [...keys]
  })()

  const {
    handleImport,
    coordinateDialog,
    closeCoordinateDialog,
    confirmCoordinateDialog,
  } = useFileImport()

  const handleLayerDragStart = (idx) => { setDraggingIdx(idx); dragRef.current = true }
  const handleLayerDragEnter = (idx) => setDragOverIdx(idx)
  const handleLayerDragEnd   = () => {
    if (draggingIdx !== null && dragOverIdx !== null && draggingIdx !== dragOverIdx) {
      reorderLayers(draggingIdx, dragOverIdx)
    }
    setDraggingIdx(null); setDragOverIdx(null); dragRef.current = false
  }

  const commitRename = (id) => {
    if (editingName.trim()) updateLayer(id, { name: editingName.trim() })
    setEditingId(null)
  }

  // Visibility state helpers
  const allVisible  = layers.length > 0 && layers.every((l) => l.visible !== false)
  const someVisible = layers.some((l) => l.visible !== false)

  const iconBtnStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, padding: 0,
    background: 'none', border: 'none', borderRadius: 6,
    cursor: 'pointer', color: 'var(--text-muted)',
    flexShrink: 0,
    transition: 'background 0.12s, color 0.12s',
  }

  return (
    <FloatingPanel panelKey="layers" title="Layers" icon={<IconStack2 size={16} />} defaultWidth={280} defaultHeight={460}>

      {/* ── Top action bar ─────────────────────────────────────── */}
      <div className="panel-section" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>

        {/* Add button + dropdown */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <button
            id="btn-layer-add"
            ref={addBtnRef}
            className="btn btn-primary"
            style={{ width: '100%', maxWidth: '170px' }}
            onClick={() => setShowAddMenu((v) => !v)}
          >
            <IconPlus size={14} /> Add Layer
          </button>

          {showAddMenu && (
            <div
              ref={addMenuRef}
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                width: '100%',
                minWidth: 180,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 400,
                padding: '4px 0',
                overflow: 'hidden',
              }}
            >
              {/* Import file */}
              <button
                id="btn-layer-import"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-primary)', textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                onClick={() => { setShowAddMenu(false); fileInputRef.current?.click() }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,212,200,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconPackageExport size={15} style={{ color: 'var(--accent-primary)', transform: 'rotate(180deg)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Import File</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>GeoJSON, KML, Shapefile, CSV…</div>
                </div>
              </button>

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />

              {/* Draw layer */}
              <button
                id="btn-layer-create"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-primary)', textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                onClick={() => { setShowAddMenu(false); setShowCreateDialog(true) }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,212,200,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconPencil size={15} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Draw Layer</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Point, line, or polygon features</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', flexShrink: 0 }} />

        {/* Zoom to extents */}
        <button
          id="btn-layer-extents"
          style={iconBtnStyle}
          title="Zoom to extents of all visible layers"
          onClick={handleZoomToExtents}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <IconMaximize size={15} />
        </button>

        {/* Refresh */}
        <button
          id="btn-layer-refresh"
          style={iconBtnStyle}
          title="Refresh map draw order"
          onClick={() => { triggerMapRefresh(); addToast({ type: 'info', message: 'Map refreshed' }) }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <IconRefresh size={15} />
        </button>

        {/* Bulk export */}
        <button
          id="btn-layer-bulk-export"
          style={iconBtnStyle}
          title="Bulk export layers"
          onClick={() => { setBulkSelected(Object.fromEntries(layers.map((l) => [l.id, true]))); setShowBulkExport(true) }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <IconPackageExport size={15} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          style={{ display: 'none' }}
          onChange={(e) => { handleImport(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* ── List header row (only when layers exist) ───────────── */}
      {layers.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px 4px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          gap: 4,
          minHeight: 28,
        }}>
          {/* Select-all checkbox */}
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allChecked}
            onChange={handleSelectAll}
            title={allChecked ? 'Deselect all' : 'Select all'}
            style={{ accentColor: 'var(--accent-primary)', width: 13, height: 13, cursor: 'pointer', flexShrink: 0, marginRight: 2 }}
          />

          {/* Hide / show all — eye icon aligned with per-row eye buttons */}
          <button
            style={{ ...iconBtnStyle, marginLeft: 'auto' }}
            title={allVisible ? 'Hide all layers' : someVisible ? 'Hide all layers' : 'Show all layers'}
            onClick={() => layers.forEach((l) => updateLayer(l.id, { visible: allVisible ? false : true }))}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            {allVisible || someVisible ? <IconEye size={13} /> : <IconEyeOff size={13} />}
          </button>

          {/* Delete selected — only visible when something is checked */}
          {checkedIds.length > 0 && (
            <button
              style={{ ...iconBtnStyle, color: 'var(--color-danger, #ef4444)' }}
              title={`Delete ${checkedIds.length} selected layer${checkedIds.length !== 1 ? 's' : ''}`}
              onClick={handleDeleteSelected}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <IconTrash size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── Layer list ─────────────────────────────────────────── */}
      {layers.length === 0 ? (
        <div className="empty-state" style={{ padding: 24 }}>
          <div className="empty-state-icon"><IconMap size={32} /></div>
          <div className="empty-state-title">No layers yet</div>
          <div className="empty-state-desc">Import a file to get started</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {[...layers].reverse().map((layer, revIdx) => {
            const idx      = layers.length - 1 - revIdx
            const isActive  = layer.id === activeLayerId
            const isEditing = editingId === layer.id
            const isChecked = !!checkedLayers[layer.id]
            return (
              <div
                key={layer.id}
                className={`layer-item${isActive ? ' active' : ''}${dragOverIdx === idx ? ' dragover' : ''}${layer.locked ? ' locked' : ''}`}
                draggable={!isEditing}
                onDragStart={() => handleLayerDragStart(idx)}
                onDragEnter={() => handleLayerDragEnter(idx)}
                onDragEnd={handleLayerDragEnd}
                onClick={() => { if (!isEditing) setActiveLayer(layer.id) }}
                onContextMenu={(e) => handleContextMenu(e, layer)}
              >
                {/* Row checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleChecked(layer.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ accentColor: 'var(--accent-primary)', width: 13, height: 13, cursor: 'pointer', flexShrink: 0 }}
                />

                {/* Color dot */}
                <div
                  className="layer-color-dot"
                  title={layer.type}
                  style={{ background: layer.style?.color || '#888', flexShrink: 0 }}
                />

                {/* Name — dbl-click to rename */}
                {isEditing ? (
                  <input
                    autoFocus
                    className="layer-edit-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitRename(layer.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(layer.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    className="layer-name"
                    title={`${layer.name} — double-click to rename`}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingId(layer.id)
                      setEditingName(layer.name)
                    }}
                  >
                    {layer.name}
                  </div>
                )}

                {/* Zoom to layer */}
                <button
                  className="btn-icon"
                  style={{ fontSize: 13, width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
                  title="Zoom to layer"
                  onClick={(e) => { e.stopPropagation(); handleZoomToLayer(layer) }}
                >
                  <IconZoomIn size={13} />
                </button>

                {/* Visibility */}
                <button
                  className="btn-icon"
                  style={{ fontSize: 13, width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
                  title={layer.visible ? 'Hide' : 'Show'}
                  onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }) }}
                >
                  {layer.visible ? <IconEye size={13} /> : <IconEyeOff size={13} />}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Symbology popover ──────────────────────────────────── */}
      {symbologyOpenId && symbologyAnchor && (
        <SymbologyMenu
          layerId={symbologyOpenId}
          anchorRect={symbologyAnchor}
          onClose={() => { setSymbologyOpenId(null); setSymbologyAnchor(null) }}
        />
      )}

      {/* ── Layer context menu ─────────────────────────────────── */}
      {contextMenu && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 2999 }}
            onClick={closeContextMenu}
            onContextMenu={(e) => { e.preventDefault(); closeContextMenu() }}
          />
          <div
            style={{
              position: 'fixed',
              top: Math.min(contextMenu.y, window.innerHeight - 260),
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              width: 192,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 3000,
              padding: '4px 0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const ctxLayer = layers.find((l) => l.id === contextMenu.layerId)
              if (!ctxLayer) return null
              return (
                <>
                  <div style={{ padding: '6px 12px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ctxLayer.style?.color || '#888', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ctxLayer.name}
                    </span>
                  </div>

                  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

                  <button
                    style={editLayerId === ctxLayer.id ? { ...menuItemStyle, color: 'var(--accent-primary)' } : menuItemStyle}
                    onClick={() => {
                      setActiveLayer(ctxLayer.id)
                      setEditLayer(editLayerId === ctxLayer.id ? null : ctxLayer.id)
                      closeContextMenu()
                    }}
                  >
                    <IconPencil size={14} />
                    <span>{editLayerId === ctxLayer.id ? 'Stop Editing' : 'Edit Features'}</span>
                  </button>

                  <button
                    style={menuItemStyle}
                    onClick={(e) => {
                      setActiveLayer(ctxLayer.id)
                      setSymbologyOpenId(ctxLayer.id)
                      const rect = e.currentTarget.getBoundingClientRect()
                      setSymbologyAnchor({ top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left })
                      closeContextMenu()
                    }}
                  >
                    <IconPalette size={14} />
                    <span>Edit Symbology</span>
                  </button>

                  <button style={menuItemStyle} onClick={() => handleOpenExportPanel(ctxLayer.id)}>
                    <IconFileExport size={14} />
                    <span>Export</span>
                  </button>

                  <button style={menuItemStyle} onClick={() => {
                    duplicateLayer(ctxLayer.id)
                    addToast({ type: 'info', message: `Duplicated "${ctxLayer.name}"` })
                    closeContextMenu()
                  }}>
                    <IconCopy size={14} />
                    <span>Duplicate</span>
                  </button>

                  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

                  <button
                    style={{ ...menuItemStyle, color: 'var(--color-danger, #ef4444)' }}
                    onClick={() => {
                      if (window.confirm(`Remove layer "${ctxLayer.name}"?`)) {
                        removeLayer(ctxLayer.id)
                      }
                      closeContextMenu()
                    }}
                  >
                    <IconTrash size={14} />
                    <span>Delete Layer</span>
                  </button>
                </>
              )
            })()}
          </div>
        </>,
        document.body
      )}

      {/* ── Create Layer dialog ────────────────────────────────── */}
      {createPortal(
        showCreateDialog && (
          <div className="modal-overlay" onClick={() => setShowCreateDialog(false)}>
            <div className="modal" style={{ width: 'min(480px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="topbar-logo-icon" style={{ width: 36, height: 36 }}>
                    <IconStack2 size={18} />
                  </div>
                  <div>
                    <div className="modal-title" style={{ fontSize: 'var(--text-lg)' }}>Create Layer</div>
                    <div className="empty-state-desc">Choose a geometry type to start drawing</div>
                  </div>
                </div>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {DRAW_TYPES.map(({ mode, icon, label, desc }) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setDrawMode(mode)
                        setDrawTargetLayer(null)
                        setShowCreateDialog(false)
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                        padding: '20px 12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        color: 'var(--text-primary)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)'
                        e.currentTarget.style.background = 'rgba(0,212,200,0.08)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-default)'
                        e.currentTarget.style.background = 'var(--bg-elevated)'
                      }}
                    >
                      <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowCreateDialog(false)}>Cancel</button>
              </div>
            </div>
          </div>
        ),
        document.body
      )}

      {/* ── Bulk export modal ──────────────────────────────────── */}
      {createPortal(
        showBulkExport && (
          <div className="modal-overlay" onClick={() => setShowBulkExport(false)}>
            <div className="modal" style={{ width: 'min(480px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="topbar-logo-icon" style={{ width: 36, height: 36 }}><IconPackageExport size={18} /></div>
                  <div>
                    <div className="modal-title" style={{ fontSize: 'var(--text-lg)' }}>Bulk Export</div>
                    <div className="empty-state-desc">Select layers and export options</div>
                  </div>
                </div>
                <button className="btn btn-icon" onClick={() => setShowBulkExport(false)}><IconX size={16} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div className="section-label" style={{ marginBottom: 8 }}>Layers</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                      onClick={() => setBulkSelected(Object.fromEntries(layers.map((l) => [l.id, true])))}>
                      All
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                      onClick={() => setBulkSelected({})}>
                      None
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                    {layers.map((layer) => (
                      <label key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', background: bulkSelected[layer.id] ? 'rgba(0,212,200,0.08)' : 'transparent', border: `1px solid ${bulkSelected[layer.id] ? 'var(--accent-primary)' : 'var(--border-subtle)'}` }}>
                        <input
                          type="checkbox"
                          checked={!!bulkSelected[layer.id]}
                          onChange={() => setBulkSelected((s) => ({ ...s, [layer.id]: !s[layer.id] }))}
                          style={{ accentColor: 'var(--accent-primary)', width: 14, height: 14, flexShrink: 0 }}
                        />
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: layer.style?.color || '#888', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{layer.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{layer.geojson?.features?.length ?? 0} feat.</span>
                        {bulkSelected[layer.id] && <IconCheck size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <label className="label">Format</label>
                  <select className="select" value={bulkFormat} onChange={(e) => setBulkFormat(e.target.value)}>
                    <option value="geojson">GeoJSON</option>
                    <option value="csv">CSV</option>
                    <option value="kml">KML</option>
                  </select>
                </div>

                <div>
                  <div className="section-label" style={{ marginBottom: 8 }}>Split output by</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { value: 'none', label: 'No splitting — one file per layer' },
                      { value: 'layer', label: 'Layer name — one file per layer (explicit)' },
                      { value: 'field', label: 'Attribute value — fan out by field' },
                    ].map(({ value, label }) => (
                      <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <input
                          type="radio"
                          name="bulkFanOut"
                          value={value}
                          checked={bulkFanOut === value}
                          onChange={() => setBulkFanOut(value)}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  {bulkFanOut === 'field' && (
                    <div className="form-row" style={{ marginTop: 10 }}>
                      <label className="label">Field to split by</label>
                      <select className="select" value={bulkFanField} onChange={(e) => setBulkFanField(e.target.value)}>
                        <option value="">— Select field —</option>
                        {bulkFields.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {bulkFormat === 'kml' && (
                  <div>
                    <div className="section-label" style={{ marginBottom: 8 }}>KML Style Settings</div>
                    <KmlSettingsForm fieldOptions={[]} />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowBulkExport(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleBulkExport}
                  disabled={!Object.values(bulkSelected).some(Boolean)}
                >
                  <IconPackageExport size={14} />
                  Export {Object.values(bulkSelected).filter(Boolean).length} layer{Object.values(bulkSelected).filter(Boolean).length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        ),
        document.body
      )}

      {createPortal(
        <CoordinateColumnDialog
          open={Boolean(coordinateDialog)}
          fileName={coordinateDialog?.fileName}
          columns={coordinateDialog?.columns}
          sampleRows={coordinateDialog?.sampleRows}
          suggestedLatKey={coordinateDialog?.suggestedLatKey}
          suggestedLngKey={coordinateDialog?.suggestedLngKey}
          showApplyToAll={coordinateDialog?.showApplyToAll ?? false}
          onCancel={closeCoordinateDialog}
          onConfirm={confirmCoordinateDialog}
        />,
        document.body
      )}
    </FloatingPanel>
  )
}
