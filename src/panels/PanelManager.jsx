import LayerPanel           from './LayerPanel'
import AttributeTablePanel   from './AttributeTablePanel'
import GisToolsPanel         from './GisToolsPanel'
import FilterPanel           from './FilterPanel'
import DashboardPanel        from './DashboardPanel'
import ExportPanel           from './ExportPanel'
import SearchPanel           from './SearchPanel'
import DrawingToolbar        from './DrawingToolbar'
import MeasurePanel          from './MeasurePanel'
import LegendPanel           from '../symbology/LegendPanel'
import PrintPanel            from './PrintPanel'
import SettingsPanel         from './SettingsPanel'
import KeybindingsPanel      from './KeybindingsPanel'
import GisLogPanel           from './GisLogPanel'

export default function PanelManager() {
  return (
    <>
      {/* Floating panels */}
      <LayerPanel />
      <AttributeTablePanel />
      <GisToolsPanel />
      <FilterPanel />
      <DashboardPanel />
      <ExportPanel />
      <SearchPanel />
      <PrintPanel />
      <SettingsPanel />
      <KeybindingsPanel />
      <GisLogPanel />

      {/* Map overlays */}
      <DrawingToolbar />
      <MeasurePanel />
      <LegendPanel />
    </>
  )
}
