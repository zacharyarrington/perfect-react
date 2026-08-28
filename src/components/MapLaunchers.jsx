import useAppStore from '../store/useAppStore'
import BasemapMenu from '../panels/MapStylePanel'
import {
  IconStack2, IconTable, IconTool, IconFilter,
  IconSearch, IconChartBar, IconFileExport, IconPrinter,
} from '@tabler/icons-react'

const LAUNCHERS = [
  { key: 'layers',     icon: <IconStack2 size={20} />,     tip: 'Layers' },
  { key: 'attributes', icon: <IconTable size={20} />,      tip: 'Attribute Table' },
  { key: 'gistools',   icon: <IconTool size={20} />,       tip: 'GIS Tools' },
  { key: 'filters',    icon: <IconFilter size={20} />,     tip: 'Filters' },
  { key: 'search',     icon: <IconSearch size={20} />,     tip: 'Search' },
  { key: 'dashboard',  icon: <IconChartBar size={20} />,   tip: 'Dashboard' },
  { key: 'export',     icon: <IconFileExport size={20} />, tip: 'Export' },
  { key: 'print',      icon: <IconPrinter size={20} />,    tip: 'Print / PDF' },
]

export default function MapLaunchers() {
  const { panels, togglePanel } = useAppStore()

  return (
    <div className="map-panel-launchers">
      {LAUNCHERS.map((l) => (
        <button
          key={l.key}
          className={`launcher-btn${panels[l.key]?.open ? ' active' : ''}`}
          data-tooltip={l.tip}
          id={`launcher-${l.key}`}
          onClick={() => togglePanel(l.key)}
          title={l.tip}
        >
          {l.icon}
        </button>
      ))}
      <BasemapMenu />
    </div>
  )
}
