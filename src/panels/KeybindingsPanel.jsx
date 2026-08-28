import FloatingPanel from './FloatingPanel'
import { IconKeyboard } from '@tabler/icons-react'

const isMac = navigator.platform.toUpperCase().includes('MAC') || navigator.userAgent.includes('Mac')
const MOD = isMac ? '⌘' : 'Ctrl'

const SECTIONS = [
  {
    title: 'Project',
    bindings: [
      { keys: [MOD, 'S'], description: 'Save project' },
      { keys: [MOD, 'I'], description: 'Import file' },
    ],
  },
  {
    title: 'Edit',
    bindings: [
      { keys: [MOD, 'Z'], description: 'Undo' },
      { keys: [MOD, 'Shift', 'Z'], description: 'Redo' },
    ],
  },
  {
    title: 'Panels',
    bindings: [
      { keys: [MOD, '1'], description: 'Toggle Layers' },
      { keys: [MOD, '2'], description: 'Toggle Attribute Table' },
      { keys: [MOD, '3'], description: 'Toggle GIS Tools' },
      { keys: [MOD, '4'], description: 'Toggle Filters' },
      { keys: [MOD, '5'], description: 'Toggle Search' },
      { keys: [MOD, '6'], description: 'Toggle Charts' },
      { keys: [MOD, '`'], description: 'Show / hide all panels' },
      { keys: ['Esc'], description: 'Close all panels' },
    ],
  },
  {
    title: 'View',
    bindings: [
      { keys: ['T'], description: 'Cycle theme' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
]

export default function KeybindingsPanel() {
  return (
    <FloatingPanel panelKey="keybindings" title="Keyboard Shortcuts" icon={<IconKeyboard size={16} />} defaultWidth={320} defaultHeight={480} minWidth={260}>
      {SECTIONS.map((section) => (
        <div key={section.title} className="panel-section">
          <div className="section-label">{section.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {section.bindings.map((binding, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                }}
              >
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  {binding.description}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  {binding.keys.map((key, ki) => (
                    <kbd key={ki} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 22,
                      padding: '1px 6px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderBottom: '2px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      lineHeight: 1.6,
                    }}>
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </FloatingPanel>
  )
}
