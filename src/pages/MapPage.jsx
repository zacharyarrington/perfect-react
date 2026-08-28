// MapPage — full-bleed map view. The map itself is the reusable <MapView>
// component (src/map/MapView.jsx) and can be embedded on any page at any
// size; layers are managed from the Layers floating panel or programmatically
// via useMapStore.

import { useEffect } from 'react'
import MapView from '../map/MapView'
import useAppStore from '../store/useAppStore'

export default function MapPage() {
  const openPanel = useAppStore((s) => s.openPanel)

  // Surface the Layers panel the first time the map page is opened this session
  useEffect(() => {
    if (sessionStorage.getItem('appshell_map_visited')) return
    sessionStorage.setItem('appshell_map_visited', '1')
    openPanel('layers')
  }, [openPanel])

  return (
    <div className="map-page">
      <MapView />
    </div>
  )
}
