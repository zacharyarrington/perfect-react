import { useState, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import {
  saveProject, loadProject, listProjects, deleteProject,
  renameProject, duplicateProject, exportProjectById, importProjectFromFile,
} from '../storage/projectManager'
import useFileImport from '../import/useFileImport'
import CoordinateColumnDialog from './CoordinateColumnDialog'
import ProfileBadge from './ProfileBadge'
import useTier from '../store/useTier'
import BasemapMenu from '../panels/MapStylePanel'
import {
  IconMap, IconFolderOpen, IconDeviceFloppy,
  IconStack2, IconTable, IconTool, IconFilter,
  IconSearch, IconChartBar, IconRoute,
  IconSun, IconMoon, IconSunMoon, IconMenu2, IconX, IconFolder,
  IconArrowBackUp, IconArrowForwardUp, IconLayoutDashboard,
  IconDownload, IconFileImport, IconCopy, IconPencil, IconCheck,
} from '@tabler/icons-react'

export default function TopBar() {
  const {
    project, setProjectName,
    panels, togglePanel,
    isLoading, loadingMessage,
    addToast,
    loadFromSnapshot, layers,
    appTheme, setAppTheme,
    undo, redo, past, future,
    workflowOpen, setWorkflowOpen,
  } = useAppStore()
  const { tier } = useTier()

  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [savedProjects, setSavedProjects]     = useState([])
  const [newProjectName, setNewProjectName]   = useState('')
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false)
  const [panelsHidden, setPanelsHidden]       = useState(false)
  const [hiddenPanelKeys, setHiddenPanelKeys] = useState([])
  const [renamingId, setRenamingId]           = useState(null)
  const [renameValue, setRenameValue]         = useState('')
  const [editingProjectName, setEditingProjectName] = useState(false)
  const [draftProjectName, setDraftProjectName]     = useState('')
  const importProjRef   = useRef(null)
  const projectNameRef  = useRef(null)
  const {
    coordinateDialog,
    closeCoordinateDialog,
    confirmCoordinateDialog,
  } = useFileImport()

  const PANEL_BUTTONS = [
    { key: 'layers',     icon: <IconStack2 size={18} />,     label: 'Layers' },
    { key: 'attributes', icon: <IconTable size={18} />,      label: 'Table' },
    { key: 'gistools',   icon: <IconTool size={18} />,       label: 'Tools' },
    { key: 'filters',    icon: <IconFilter size={18} />,     label: 'Filters' },
    { key: 'search',     icon: <IconSearch size={18} />,     label: 'Search' },
    { key: 'dashboard',  icon: <IconChartBar size={18} />,   label: 'Charts' },
    // { key: 'print',      icon: <IconPrinter size={18} />,    label: 'Print' },
  ]

  const handleSave = async () => {
    try {
      await saveProject(project.name)
      addToast({ type: 'success', message: `Project "${project.name}" saved!` })
    } catch (e) {
      addToast({ type: 'error', message: `Save failed: ${e.message}` })
    }
  }

  const handleOpenMenu = async () => {
    const projects = await listProjects()
    setSavedProjects(projects)
    setShowProjectMenu(true)
  }

  const handleLoad = async (id) => {
    try {
      await loadProject(id)
      addToast({ type: 'success', message: 'Project loaded!' })
      setShowProjectMenu(false)
    } catch (e) {
      addToast({ type: 'error', message: `Load failed: ${e.message}` })
    }
  }

  const handleNewProject = () => {
    loadFromSnapshot({
      project: { name: newProjectName || 'New Project', createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString() },
      layers: [],
    })
    setNewProjectName('')
    setShowProjectMenu(false)
    addToast({ type: 'info', message: 'New project created' })
  }

  const handleExport = async (id) => {
    try {
      await exportProjectById(id)
    } catch (e) {
      addToast({ type: 'error', message: `Export failed: ${e.message}` })
    }
  }

  const handleImportProject = async (file) => {
    if (!file) return
    try {
      const snapshot = await importProjectFromFile(file)
      // Save it as a new stored project then load it
      await saveProject(snapshot.project.name)
      loadFromSnapshot(snapshot)
      const projects = await listProjects()
      setSavedProjects(projects)
      addToast({ type: 'success', message: `Project "${snapshot.project.name}" imported!` })
    } catch (e) {
      addToast({ type: 'error', message: `Import failed: ${e.message}` })
    }
    importProjRef.current.value = ''
  }

  const handleDuplicate = async (id, e) => {
    e.stopPropagation()
    try {
      await duplicateProject(id)
      const projects = await listProjects()
      setSavedProjects(projects)
    } catch (e) {
      addToast({ type: 'error', message: `Duplicate failed: ${e.message}` })
    }
  }

  const handleRenameStart = (id, currentName, e) => {
    e.stopPropagation()
    setRenamingId(id)
    setRenameValue(currentName)
  }

  const handleRenameCommit = async (id, e) => {
    e?.stopPropagation()
    if (!renameValue.trim()) { setRenamingId(null); return }
    try {
      await renameProject(id, renameValue.trim())
      const projects = await listProjects()
      setSavedProjects(projects)
    } catch (e) {
      addToast({ type: 'error', message: `Rename failed: ${e.message}` })
    }
    setRenamingId(null)
  }

  const handleTogglePanels = () => {
    if (panelsHidden) {
      hiddenPanelKeys.forEach(key => togglePanel(key))
      setHiddenPanelKeys([])
      setPanelsHidden(false)
    } else {
      const openKeys = Object.entries(panels).filter(([, p]) => p.open).map(([key]) => key)
      openKeys.forEach(key => togglePanel(key))
      setHiddenPanelKeys(openKeys)
      setPanelsHidden(true)
    }
  }

  return (
    <>
      <header className="topbar">
        {/* Logo */}
        <a className="topbar-logo" href="/" onClick={(e) => e.preventDefault()}>
          <div className="topbar-logo-icon"><IconMap size={22} /></div>
          <span className="topbar-logo-text">ReadyMapGo</span>
        </a>

        <div className="topbar-divider" />

        {/* Project controls */}
        <div className="topbar-actions">
          {/* Project name pill — click to open dropdown */}
          <div style={{ position: 'relative' }} ref={projectNameRef}>
            <button
              className="btn btn-ghost"
              style={{ gap: 6, fontWeight: 600, maxWidth: 200 }}
              onClick={() => setShowProjectDropdown((o) => !o)}
              id="btn-project-menu"
            >
              <IconMap size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                {project.name}
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0, opacity: 0.5 }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </button>

            {showProjectDropdown && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 2999 }} onClick={() => setShowProjectDropdown(false)} />
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  minWidth: 220,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  zIndex: 3000,
                  overflow: 'hidden',
                }}>
                  {/* Inline rename */}
                  <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid var(--border-subtle)' }}>
                    {editingProjectName ? (
                      <input
                        autoFocus
                        className="input input-sm"
                        style={{ width: '100%' }}
                        value={draftProjectName}
                        onChange={(e) => setDraftProjectName(e.target.value)}
                        onBlur={() => {
                          if (draftProjectName.trim()) setProjectName(draftProjectName.trim())
                          setEditingProjectName(false)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (draftProjectName.trim()) setProjectName(draftProjectName.trim())
                            setEditingProjectName(false)
                          }
                          if (e.key === 'Escape') setEditingProjectName(false)
                        }}
                      />
                    ) : (
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'text' }}
                        onClick={() => { setDraftProjectName(project.name); setEditingProjectName(true) }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.name}
                        </span>
                        <IconPencil size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
                      </div>
                    )}
                  </div>

                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    onClick={() => { handleSave(); setShowProjectDropdown(false) }}
                  >
                    <IconDeviceFloppy size={14} style={{ opacity: 0.7 }} /> Save
                  </button>

                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    onClick={() => { setShowProjectDropdown(false); handleOpenMenu() }}
                  >
                    <IconFolderOpen size={14} style={{ opacity: 0.7 }} /> Open / Manage Projects
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="topbar-divider" />

          {/* Undo / Redo */}
          <button
            className="btn btn-icon"
            data-tooltip={`Undo${past.length ? ` (${past.length})` : ''}`}
            onClick={undo}
            disabled={past.length === 0}
            style={{ opacity: past.length === 0 ? 0.35 : 1 }}
          >
            <IconArrowBackUp size={16} />
          </button>
          <button
            className="btn btn-icon"
            data-tooltip={`Redo${future.length ? ` (${future.length})` : ''}`}
            onClick={redo}
            disabled={future.length === 0}
            style={{ opacity: future.length === 0 ? 0.35 : 1 }}
          >
            <IconArrowForwardUp size={16} />
          </button>
        </div>

        {/* Panel toggles */}
        <div className="topbar-right">
          {PANEL_BUTTONS.map((p) => (
            <button
              key={p.key}
              id={`btn-panel-${p.key}`}
              className={`btn btn-icon${panels[p.key]?.open ? ' active' : ''}`}
              data-tooltip={p.label}
              onClick={() => togglePanel(p.key)}
            >
              {p.icon}
            </button>
          ))}

          <div className="topbar-divider" />

          {/* Toggle all panels */}
          <button
            className={`btn btn-icon${panelsHidden ? ' active' : ''}`}
            data-tooltip={panelsHidden ? 'Show panels' : 'Hide all panels'}
            onClick={handleTogglePanels}
          >
            <IconLayoutDashboard size={18} />
          </button>

          {/* Basemap picker */}
          <BasemapMenu inTopbar />

          {/* Theme toggle: cycles auto → dark → light → auto */}
          <button
            className={`btn btn-icon${appTheme !== 'auto' ? ' active' : ''}`}
            data-tooltip={appTheme === 'auto' ? 'Theme: Auto (follows basemap)' : appTheme === 'dark' ? 'Theme: Dark' : 'Theme: Light'}
            onClick={() => setAppTheme(appTheme === 'auto' ? 'dark' : appTheme === 'dark' ? 'light' : 'auto')}
            style={{ fontSize: 15 }}
          >
            {appTheme === 'light' ? <IconSun size={18} /> : appTheme === 'dark' ? <IconMoon size={18} /> : <IconSunMoon size={18} />}
          </button>

          {/* Layer count badge */}
          {layers.length > 0 && (
            <span className="badge badge-teal" style={{ fontSize: 11 }}>
              {layers.length} layer{layers.length !== 1 ? 's' : ''}
            </span>
          )}

          {/* Current plan */}
          <span
            className={`badge ${tier === 'pro' ? 'badge-teal' : ''}`}
            style={{ fontSize: 11, textTransform: 'uppercase' }}
            data-tooltip={tier === 'pro' ? 'Pro plan' : 'Free plan'}
          >
            {tier}
          </span>

          {/* Profile — single entry point for local profiles and Clerk accounts */}
          <ProfileBadge />
        </div>

        {/* Hamburger – shown only on small screens */}
        <button
          className={`btn btn-icon topbar-hamburger${mobileMenuOpen ? ' active' : ''}`}
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="topbar-mobile-menu" onClick={() => setMobileMenuOpen(false)}>
          <div className="topbar-mobile-actions" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost" onClick={handleSave}><IconDeviceFloppy size={16} /> <span>Save</span></button>
            <button className="btn btn-ghost" onClick={handleOpenMenu}><IconFolderOpen size={16} /> <span>Projects</span></button>
          </div>
          <div className="topbar-mobile-panels" onClick={(e) => e.stopPropagation()}>
            {PANEL_BUTTONS.map((p) => (
              <button
                key={p.key}
                className={`btn btn-ghost topbar-mobile-panel-btn${panels[p.key]?.open ? ' active' : ''}`}
                onClick={() => { togglePanel(p.key); setMobileMenuOpen(false) }}
              >
                <span className="topbar-mobile-panel-icon">{p.icon}</span>
                <span className="topbar-mobile-panel-label">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading bar */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 'var(--topbar-height)',
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
          zIndex: 'var(--z-topbar)',
          animation: 'none',
        }}>
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 14px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}>
            <span className="spinner" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
            {loadingMessage || 'Loading…'}
          </div>
        </div>
      )}

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
      />

      {/* Project menu overlay */}
      {showProjectMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 'var(--z-modal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowProjectMenu(false)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              width: 480,
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Projects</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => importProjRef.current?.click()}
                data-tooltip="Import project from JSON file"
              >
                <IconFileImport size={15} /> Import File
              </button>
              <input
                ref={importProjRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => handleImportProject(e.target.files?.[0])}
              />
            </div>

            {/* New project */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                className="input"
                placeholder="New project name…"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNewProject()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleNewProject}>Create</button>
            </div>

            {/* Saved projects */}
            {savedProjects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><IconFolder size={32} /></div>
                <div className="empty-state-title">No saved projects</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedProjects.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                    onClick={() => renamingId !== p.id && handleLoad(p.id)}
                  >
                    {/* Name / rename input */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renamingId === p.id ? (
                        <input
                          className="input input-sm"
                          style={{ width: '100%' }}
                          value={renameValue}
                          autoFocus
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameCommit(p.id, e)
                            if (e.key === 'Escape') { e.stopPropagation(); setRenamingId(null) }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {p.layerCount} layer{p.layerCount !== 1 ? 's' : ''} · {new Date(p.modifiedAt).toLocaleDateString()}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {renamingId === p.id ? (
                      <button
                        className="btn btn-icon btn-sm"
                        onClick={(e) => handleRenameCommit(p.id, e)}
                        data-tooltip="Save name"
                      >
                        <IconCheck size={14} />
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-icon btn-ghost btn-xs" data-tooltip="Rename" onClick={(e) => handleRenameStart(p.id, p.name, e)}><IconPencil size={13} /></button>
                        <button className="btn btn-icon btn-ghost btn-xs" data-tooltip="Duplicate" onClick={(e) => handleDuplicate(p.id, e)}><IconCopy size={13} /></button>
                        <button className="btn btn-icon btn-ghost btn-xs" data-tooltip="Export as JSON" onClick={(e) => { e.stopPropagation(); handleExport(p.id) }}><IconDownload size={13} /></button>
                        <button
                          className="btn btn-danger btn-xs"
                          data-tooltip="Delete"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await deleteProject(p.id)
                            setSavedProjects((ps) => ps.filter((x) => x.id !== p.id))
                          }}
                        ><IconX size={13} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={() => setShowProjectMenu(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
