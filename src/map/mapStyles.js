// Base map style definitions shared across the app
export const BASE_STYLES = [
  { id: 'dark-v11',               label: 'Dark',       url: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'light-v11',              label: 'Light',      url: 'mapbox://styles/mapbox/light-v11' },
  { id: 'satellite-streets-v12',  label: 'Satellite',  url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'streets-v12',            label: 'Streets',    url: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'outdoors-v12',           label: 'Outdoors',   url: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'navigation-night-v1',    label: 'Nav Night',  url: 'mapbox://styles/mapbox/navigation-night-v1' },
]

const LIGHT_IDS = ['light-v11', 'streets-v12', 'outdoors-v12']
export const isLightStyle = (url) => LIGHT_IDS.some((id) => url?.includes(id))
