import FloatingPanel from './FloatingPanel'
import PANELS from '../config/panels.config'
import { IconKeyboard } from '@tabler/icons-react'

const isMac = navigator.platform.toUpperCase().includes('MAC') || navigator.userAgent.includes('Mac')
const MOD = isMac ? '⌘' : 'Ctrl'

// Computed lazily — this module and panels.config import each other, so the
// registry isn't initialized yet at module-eval time.
function getSections() {
  // Panel toggle shortcuts mirror the registry order (see App.jsx)
  const panelBindings = PANELS
    .filter((p) => p.showToggle)
    .slice(0, 9)
    .map((p, i) => ({ keys: [MOD, String(i + 1)], description: `Toggle ${p.title}` }))

  return [
    {
      title: 'Panels',
      bindings: [
        ...panelBindings,
        { keys: [MOD, '`'], description: 'Show / hide all panels' },
        { keys: ['Esc'], description: 'Close all panels' },
      ],
    },
    {
      title: 'View',
      bindings: [
        { keys: [MOD, 'B'], description: 'Collapse / expand sidebar' },
        { keys: [MOD, 'D'], description: 'Collapse / expand dock rail' },
        { keys: ['T'], description: 'Cycle theme' },
        { keys: ['?'], description: 'Show keyboard shortcuts' },
      ],
    },
  ]
}

export default function KeybindingsPanel() {
  const SECTIONS = getSections()
  return (
    <FloatingPanel
      panelKey="keybindings"
      title="Keyboard Shortcuts"
      icon={<IconKeyboard size={16} />}
      defaultWidth={340}
      defaultHeight={460}
      minWidth={260}
    >
      {SECTIONS.map((section) => (
        <div key={section.title} className="panel-section">
          <div className="section-label">{section.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {section.bindings.map((binding, i) => (
              <div key={i} className="keybinding-row">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  {binding.description}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  {binding.keys.map((key, ki) => (
                    <kbd key={ki} className="kbd">{key}</kbd>
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
