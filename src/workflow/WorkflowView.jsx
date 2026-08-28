import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import WorkflowCanvas from './WorkflowCanvas'
import { executeWorkflow } from './transformerEngine'
import {
  IconX, IconPlayerPlay, IconTrash, IconChartBar,
  IconCircleCheck, IconAlertTriangle, IconLoader,
} from '@tabler/icons-react'

export default function WorkflowView() {
  const {
    workflowOpen, setWorkflowOpen,
    workflowNodes, workflowEdges, clearWorkflow,
    layers, addLayer, addToast,
  } = useAppStore()

  const [runState, setRunState]     = useState('idle')   // idle | running | success | error
  const [runLog,   setRunLog]       = useState([])        // [{ level, message }]
  const [logOpen,  setLogOpen]      = useState(false)

  if (!workflowOpen) return null

  const handleRun = async () => {
    setRunState('running')
    setRunLog([])
    setLogOpen(true)

    // Small delay so UI can repaint to "running" before synchronous work
    await new Promise((r) => setTimeout(r, 50))

    try {
      const results = executeWorkflow(workflowNodes, workflowEdges, layers)
      const log = []

      for (const { layerName, geojson } of results) {
        const count = geojson?.features?.length ?? 0
        const newId = addLayer({
          name: layerName,
          geojson,
          type: inferType(geojson),
        })
        log.push({ level: 'success', message: `Created layer "${layerName}" — ${count.toLocaleString()} feature${count !== 1 ? 's' : ''} (id: ${newId})` })
        addToast({ type: 'success', message: `Workflow output: "${layerName}" added to map` })
      }

      setRunLog(log)
      setRunState('success')
    } catch (e) {
      setRunLog([{ level: 'error', message: e.message }])
      setRunState('error')
      addToast({ type: 'error', message: `Workflow failed: ${e.message}` })
    }
  }

  const handleClear = () => {
    if (workflowNodes.length === 0 || window.confirm('Clear the entire workflow?')) {
      clearWorkflow()
      setRunState('idle')
      setRunLog([])
    }
  }

  return (
    <div className="wf-view">
      {/* Top toolbar */}
      <div className="wf-toolbar">
        <div className="wf-toolbar-left">
          <div className="wf-toolbar-logo">
            <IconChartBar size={18} />
            <span>Workflow Editor</span>
          </div>
          <div className="wf-toolbar-divider" />
          <span className="wf-toolbar-stat">
            {workflowNodes.length} node{workflowNodes.length !== 1 ? 's' : ''} · {workflowEdges.length} connection{workflowEdges.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="wf-toolbar-center">
          <button
            className={`wf-run-btn${runState === 'running' ? ' wf-run-btn-running' : ''}`}
            onClick={handleRun}
            disabled={runState === 'running' || workflowNodes.length === 0}
          >
            {runState === 'running'
              ? <><IconLoader size={16} className="wf-spin" /> Running…</>
              : <><IconPlayerPlay size={16} /> Run Workflow</>
            }
          </button>
        </div>

        <div className="wf-toolbar-right">
          {runLog.length > 0 && (
            <button
              className={`wf-log-btn${runState === 'error' ? ' wf-log-btn-error' : ' wf-log-btn-success'}`}
              onClick={() => setLogOpen((o) => !o)}
            >
              {runState === 'error'
                ? <IconAlertTriangle size={14} />
                : <IconCircleCheck size={14} />
              }
              {logOpen ? 'Hide log' : 'Show log'}
            </button>
          )}
          <button
            className="wf-toolbar-btn"
            onClick={handleClear}
            title="Clear workflow"
            disabled={workflowNodes.length === 0}
          >
            <IconTrash size={16} />
            <span>Clear</span>
          </button>
          <div className="wf-toolbar-divider" />
          <button
            className="wf-toolbar-btn wf-toolbar-btn-close"
            onClick={() => setWorkflowOpen(false)}
            title="Back to map"
          >
            <IconX size={16} />
            <span>Back to Map</span>
          </button>
        </div>
      </div>

      {/* Run log */}
      {logOpen && runLog.length > 0 && (
        <div className="wf-log">
          {runLog.map((entry, i) => (
            <div key={i} className={`wf-log-entry wf-log-${entry.level}`}>
              {entry.level === 'error'
                ? <IconAlertTriangle size={13} />
                : <IconCircleCheck size={13} />
              }
              <span>{entry.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Canvas */}
      <WorkflowCanvas runState={runState} />
    </div>
  )
}

function inferType(geojson) {
  const types = new Set(
    (geojson?.features || []).map((f) => {
      const t = f.geometry?.type || ''
      if (t.includes('Point'))   return 'point'
      if (t.includes('Line'))    return 'line'
      if (t.includes('Polygon')) return 'polygon'
      return 'mixed'
    })
  )
  if (types.size === 1) return [...types][0]
  return 'mixed'
}
