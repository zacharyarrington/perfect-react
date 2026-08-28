import { useState } from 'react'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import { IconListDetails, IconCircleCheck, IconCircleX, IconTrash } from '@tabler/icons-react'

export default function GisLogPanel() {
  const { gisLog, clearGisLog } = useAppStore()
  const [expandedId, setExpandedId] = useState(null)

  return (
    <FloatingPanel
      panelKey="gislog"
      title="GIS Operation Log"
      icon={<IconListDetails size={16} />}
      defaultWidth={340}
      defaultHeight={420}
    >
      <div className="panel-section" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-label" style={{ margin: 0 }}>
            {gisLog.length} operation{gisLog.length !== 1 ? 's' : ''}
            {gisLog.some((e) => e.status === 'error') && (
              <span style={{
                marginLeft: 6,
                background: 'var(--accent-danger)', color: '#fff',
                borderRadius: 999, fontSize: 10, padding: '1px 6px', fontWeight: 700,
              }}>
                {gisLog.filter((e) => e.status === 'error').length} error{gisLog.filter((e) => e.status === 'error').length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {gisLog.length > 0 && (
            <button className="btn btn-ghost btn-xs" onClick={clearGisLog} style={{ gap: 4 }}>
              <IconTrash size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {gisLog.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 40 }}>
          <div className="empty-state-icon"><IconListDetails size={28} /></div>
          <div className="empty-state-title">No operations yet</div>
          <div className="empty-state-desc">GIS tool runs will appear here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px' }}>
          {gisLog.map((entry) => {
            const isError = entry.status === 'error'
            const isExpanded = expandedId === entry.id
            return (
              <div
                key={entry.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${isError ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                  borderRadius: 7,
                  padding: '7px 10px',
                  cursor: 'pointer',
                  transition: 'border-color var(--duration-fast)',
                }}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <span style={{
                    flexShrink: 0, marginTop: 1,
                    color: isError ? 'var(--accent-danger)' : 'var(--accent-success, #22c55e)',
                  }}>
                    {isError ? <IconCircleX size={14} /> : <IconCircleCheck size={14} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {entry.tool}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 'var(--text-xs)',
                      color: isError ? 'var(--accent-danger)' : 'var(--text-secondary)',
                      lineHeight: 1.5,
                      ...(isExpanded ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
                    }}>
                      {entry.message}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </FloatingPanel>
  )
}
