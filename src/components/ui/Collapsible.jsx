// Collapsible — an expandable section with a chevron header.
//
//   <Collapsible title="Advanced options" defaultOpen={false}>…</Collapsible>

import { useState } from 'react'
import { IconChevronRight } from '@tabler/icons-react'

export default function Collapsible({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="collapsible">
      <button className="collapsible-header" onClick={() => setOpen((o) => !o)}>
        <IconChevronRight
          size={14}
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform var(--duration-fast)',
            flexShrink: 0,
          }}
        />
        <span>{title}</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  )
}
