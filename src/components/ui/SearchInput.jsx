// SearchInput — input with a search icon and a clear button.
//
//   <SearchInput value={q} onChange={setQ} placeholder="Search users…" />

import { IconSearch, IconX } from '@tabler/icons-react'

export default function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`search-input ${className}`}>
      <IconSearch size={14} className="search-input-icon" />
      <input
        className="input"
        style={{ paddingLeft: 30, paddingRight: value ? 28 : 10 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-input-clear" onClick={() => onChange('')} aria-label="Clear search">
          <IconX size={13} />
        </button>
      )}
    </div>
  )
}
