// Tabs — controlled or uncontrolled tab strip + content.
//
//   <Tabs tabs={[{ key: 'a', label: 'One', content: <One/> }, …]} />
//   <Tabs tabs={…} active={key} onChange={setKey} />   (controlled)

import { useState } from 'react'

export default function Tabs({ tabs = [], active, onChange, className = '' }) {
  const [internal, setInternal] = useState(tabs[0]?.key)
  const current = active ?? internal
  const select = (key) => (onChange ? onChange(key) : setInternal(key))
  const activeTab = tabs.find((t) => t.key === current) || tabs[0]

  return (
    <div className={className}>
      <div className="tabs" style={{ padding: '0 0 var(--space-2)' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab-btn${t.key === current ? ' active' : ''}`}
            onClick={() => select(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  )
}
