import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'
import './tour.css'
import useAppStore from '../store/useAppStore'

const TOUR_KEY = 'rmg_tour_v1_seen'

// ── Sample data loaded for the tour ──────────────────────────────────────────

const SAMPLE_CITIES = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-87.6298, 41.8781] }, properties: { name: 'Chicago', state: 'IL', population: 2696555, category: 'Major City' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] }, properties: { name: 'San Francisco', state: 'CA', population: 873965, category: 'Major City' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-95.3698, 29.7604] }, properties: { name: 'Houston', state: 'TX', population: 2304580, category: 'Major City' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-112.0740, 33.4484] }, properties: { name: 'Phoenix', state: 'AZ', population: 1608139, category: 'Major City' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.1652, 39.9526] }, properties: { name: 'Philadelphia', state: 'PA', population: 1603797, category: 'Major City' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-104.9903, 39.7392] }, properties: { name: 'Denver', state: 'CO', population: 715522, category: 'Regional Hub' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-90.1994, 38.6270] }, properties: { name: 'St. Louis', state: 'MO', population: 301578, category: 'Regional Hub' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-86.1581, 39.7684] }, properties: { name: 'Indianapolis', state: 'IN', population: 887642, category: 'Regional Hub' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.6944, 41.4993] }, properties: { name: 'Cleveland', state: 'OH', population: 383793, category: 'Regional Hub' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-84.3880, 33.7490] }, properties: { name: 'Atlanta', state: 'GA', population: 498715, category: 'Major City' } },
  ],
}

const SAMPLE_REGIONS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-100, 37], [-90, 37], [-90, 45], [-100, 45], [-100, 37]]],
      },
      properties: { name: 'Midwest Zone', zone_type: 'Analysis Area', area_km2: 980000 },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-125, 32], [-115, 32], [-115, 42], [-125, 42], [-125, 32]]],
      },
      properties: { name: 'West Coast Zone', zone_type: 'Analysis Area', area_km2: 780000 },
    },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function btn(text, type, action) {
  return { text, classes: `btn btn-${type}`, action }
}

// Wait for an element to appear in the DOM (panels render async after store update)
function waitForEl(selector, timeout = 2000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector)
    if (el) return resolve(el)
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector)
      if (found) { observer.disconnect(); resolve(found) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => { observer.disconnect(); resolve(null) }, timeout)
  })
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Tour ──────────────────────────────────────────────────────────────────────

export function startTour() {

  const store = useAppStore.getState()

  // ── 1. Load sample data into the store ────────────────────────────────────
  // Clear any existing tour layers first
  const existing = store.layers.filter((l) => l._tourLayer)
  existing.forEach((l) => store.removeLayer(l.id))

  const citiesId = store.addLayer({
    name: 'Sample Cities',
    type: 'point',
    geojson: SAMPLE_CITIES,
    _tourLayer: true,
    style: {
      type: 'circle',
      color: '#00d4c8',
      strokeColor: '#ffffff',
      strokeWidth: 1.5,
      radius: 7,
      opacity: 0.9,
      popupFields: ['name', 'state', 'population', 'category'],
    },
  })

  const regionsId = store.addLayer({
    name: 'Sample Regions',
    type: 'polygon',
    geojson: SAMPLE_REGIONS,
    _tourLayer: true,
    style: {
      type: 'fill',
      color: '#f59e0b',
      strokeColor: '#f59e0b',
      strokeWidth: 1,
      fillOpacity: 0.15,
      opacity: 0.8,
    },
  })

  // ── 2. Set up initial panel state ─────────────────────────────────────────
  store.openPanel('layers')
  ;['attributes', 'gistools', 'filters', 'search', 'dashboard', 'export'].forEach((k) =>
    store.closePanel(k)
  )

  // Zoom to the sample data
  store.setPendingFitBounds([-130, 25, -65, 50])

  // ── 3. Build tour ─────────────────────────────────────────────────────────

  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      scrollTo: false,
      cancelIcon: { enabled: true },
      modalOverlayOpeningPadding: 6,
      modalOverlayOpeningRadius: 8,
      popperOptions: {
        modifiers: [{ name: 'offset', options: { offset: [0, 14] } }],
      },
      when: {
        show() {
          const current = tour.steps.indexOf(tour.currentStep)
          const total = tour.steps.length
          const footer = this.el?.querySelector('.shepherd-footer')
          if (footer && !footer.querySelector('.shepherd-progress')) {
            const prog = document.createElement('span')
            prog.className = 'shepherd-progress'
            prog.style.cssText = 'font-size:11px;color:var(--text-muted);margin-right:auto;'
            prog.textContent = `${current + 1} / ${total}`
            footer.prepend(prog)
          }
        },
      },
    },
  })

  const next = () => tour.next()
  const back = () => tour.back()

  const navBtns = (showBack = true) => [
    ...(showBack ? [btn('Back', 'ghost', back)] : []),
    btn('Next →', 'primary', next),
  ]

  const lastBtns = [
    btn('Back', 'ghost', back),
    btn('Done 🎉', 'primary', () => tour.complete()),
  ]

  // ── Steps ─────────────────────────────────────────────────────────────────

  // STEP 0 — Project menu
  tour.addStep({
    id: 'topbar-project',
    title: 'Project Menu',
    text: `
      <p>Your <strong>project name</strong> lives here. Click it to save, open a previous project, or rename it.</p>
      <p>Projects are stored locally in your browser — no account needed. Use <kbd>Ctrl+S</kbd> to save quickly at any time.</p>
    `,
    attachTo: { element: '#btn-project-menu', on: 'bottom-start' },
    buttons: [
      btn('Skip tour', 'ghost', () => tour.cancel()),
      btn('Next →', 'primary', next),
    ],
  })

  // STEP 2 — Panel toggles
  tour.addStep({
    id: 'topbar-panels',
    title: 'Panel Toggles',
    text: `
      <p>These buttons open and close the floating tool panels. You'll use them throughout the tour.</p>
      <p><kbd>Ctrl+1</kbd> through <kbd>Ctrl+6</kbd> toggle each panel. <kbd>Esc</kbd> hides them all so you can focus on the map.</p>
    `,
    attachTo: { element: '.topbar-right', on: 'bottom' },
    buttons: navBtns(),
  })

  // STEP 3 — Layers panel (point at the actual floating panel)
  tour.addStep({
    id: 'layers-panel',
    title: 'The Layers Panel',
    text: `
      <p>This is your <strong>command center</strong>. The two sample layers we loaded — <em>Sample Cities</em> and <em>Sample Regions</em> — are listed here.</p>
      <p>Layers render in order from bottom to top. <strong>Drag</strong> a layer row to reorder. <strong>Double-click</strong> the name to rename it.</p>
    `,
    beforeShowPromise: () => {
      store.openPanel('layers')
      return waitForEl('[data-panel-key="layers"]').then((el) => delay(80))
    },
    attachTo: { element: '[data-panel-key="layers"]', on: 'right' },
    buttons: navBtns(),
  })

  // STEP 4 — Layer list item (zoom icon + visibility)
  tour.addStep({
    id: 'layer-item',
    title: 'Layer Controls',
    text: `
      <p>Each layer row has two quick controls on the right:</p>
      <ul style="margin:6px 0 0;padding-left:18px;line-height:1.9">
        <li>The <strong>magnifier</strong> icon zooms the map to that layer's extent</li>
        <li>The <strong>eye</strong> icon toggles visibility without removing the layer</li>
      </ul>
      <p style="margin-top:8px"><strong>Right-click</strong> any layer for more options — edit, style, export, duplicate, and delete.</p>
    `,
    beforeShowPromise: () => waitForEl('.layer-item'),
    attachTo: { element: '.layer-item', on: 'right' },
    buttons: navBtns(),
  })

  // STEP 5 — Add Layer button
  tour.addStep({
    id: 'import-create',
    title: 'Adding Your Own Data',
    text: `
      <p>The <strong>Add Layer</strong> button is your entry point for getting data onto the map. Click it to reveal two options:</p>
      <ul style="margin:6px 0 0;padding-left:18px;line-height:1.9">
        <li><strong>Import File</strong> — load GeoJSON, KML/KMZ, Shapefile (.zip), CSV/Excel with coordinates, or GPX</li>
        <li><strong>Draw Layer</strong> — sketch points, lines, or polygons directly on the map</li>
      </ul>
    `,
    beforeShowPromise: () => waitForEl('#btn-layer-add'),
    attachTo: { element: '#btn-layer-add', on: 'bottom' },
    buttons: navBtns(),
  })

  // STEP 6 — Right-click context menu (point at layer name to hint)
  tour.addStep({
    id: 'layer-context',
    title: 'Right-Click a Layer',
    text: `
      <p>Try right-clicking <em>Sample Cities</em> to see the context menu. It gives you:</p>
      <ul style="margin:6px 0 0;padding-left:18px;line-height:1.9">
        <li><strong>Edit Features</strong> — move or reshape geometry on the map</li>
        <li><strong>Edit Symbology</strong> — colors, icons, labels, and popup fields</li>
        <li><strong>Export</strong> — GeoJSON, CSV, Excel, or KML with full settings</li>
        <li><strong>Duplicate</strong> — clone the layer for parallel workflows</li>
      </ul>
    `,
    beforeShowPromise: () => waitForEl('.layer-name'),
    attachTo: { element: '.layer-item.active .layer-name, .layer-item:first-child .layer-name', on: 'right' },
    buttons: navBtns(),
  })

  // STEP 7 — Layer panel utility controls
  tour.addStep({
    id: 'layer-controls',
    title: 'Layer Panel Controls',
    text: `
      <p>The top bar also holds three utility icon buttons (to the right of the divider):</p>
      <ul style="margin:6px 0 0;padding-left:18px;line-height:1.9">
        <li><strong>Extents</strong> — zoom to fit all visible layers at once</li>
        <li><strong>Refresh</strong> — force a full map redraw to fix any layer-order glitches</li>
        <li><strong>Bulk Export</strong> — export multiple layers at once, with fan-out by attribute value</li>
      </ul>
      <p style="margin-top:8px">Below the top bar, the <strong>header row</strong> lets you select all layers with a checkbox and toggle all visibility at once with the eye icon.</p>
    `,
    beforeShowPromise: () => waitForEl('#btn-layer-extents'),
    attachTo: { element: '#btn-layer-extents', on: 'bottom' },
    buttons: navBtns(),
  })

  // STEP 8 — Open attribute table and point at it
  tour.addStep({
    id: 'attribute-table',
    title: 'Attribute Table',
    text: `
      <p>The <strong>Table panel</strong> is now open showing the <em>Sample Cities</em> attributes — name, state, population, and category for all 10 features.</p>
      <p>Click any row to select that city on the map. Selection is two-way: clicking a point on the map highlights its row here too. You can also <strong>edit cell values</strong> inline.</p>
    `,
    beforeShowPromise: () => {
      store.setActiveLayer(citiesId)
      store.openPanel('attributes')
      return waitForEl('[data-panel-key="attributes"]').then(() => delay(120))
    },
    attachTo: { element: '[data-panel-key="attributes"]', on: 'top' },
    buttons: navBtns(),
  })

  // STEP 9 — Map interaction (close attribute table, zoom to cities)
  tour.addStep({
    id: 'map-interaction',
    title: 'Interacting with the Map',
    text: `
      <p>The sample cities are plotted on the map. Try hovering one — a <strong>popup</strong> appears showing the name, state, population, and category fields.</p>
      <p>Click a city to <strong>select it and zoom in</strong> automatically. The navigation controls (top-left) let you zoom, rotate, and geolocate.</p>
    `,
    beforeShowPromise: () => {
      store.closePanel('attributes')
      store.setPendingFitBounds([-130, 25, -65, 50])
      return delay(300)
    },
    attachTo: { element: '.map-container', on: 'right' },
    modalOverlayOpeningPadding: 0,
    buttons: navBtns(),
  })

  // STEP 10 — GIS Tools
  tour.addStep({
    id: 'gis-tools',
    title: 'GIS Tools',
    text: `
      <p>The <strong>Tools panel</strong> runs spatial analysis operations entirely in your browser — no server required:</p>
      <ul style="margin:6px 0 0;padding-left:18px;line-height:1.9">
        <li>Buffer, clip, dissolve, union, intersect</li>
        <li>Centroid, convex hull, simplify</li>
        <li>Coordinate conversion &amp; reprojection</li>
      </ul>
      <p style="margin-top:8px">Results appear as new layers. Everything is logged in the <strong>GIS Log</strong> (profile menu).</p>
    `,
    beforeShowPromise: () => {
      store.openPanel('gistools')
      return waitForEl('[data-panel-key="gistools"]').then(() => delay(80))
    },
    attachTo: { element: '[data-panel-key="gistools"]', on: 'left' },
    buttons: navBtns(),
  })

  // STEP 11 — Filters panel
  tour.addStep({
    id: 'filters',
    title: 'Filters',
    text: `
      <p>The <strong>Filters panel</strong> lets you show only features that match attribute conditions — without deleting data.</p>
      <p>For example, you could filter <em>Sample Cities</em> to show only cities where <code>category = Major City</code>. Filters are live — the map updates as you type. You can also export a filtered subset.</p>
    `,
    beforeShowPromise: () => {
      store.closePanel('gistools')
      store.openPanel('filters')
      return waitForEl('[data-panel-key="filters"]').then(() => delay(80))
    },
    attachTo: { element: '[data-panel-key="filters"]', on: 'left' },
    buttons: navBtns(),
  })

  // STEP 12 — Launchers
  // tour.addStep({
  //   id: 'launchers',
  //   title: 'Panel Launchers',
  //   text: `
  //     <p>The launcher icons in the bottom-right corner of the map are a shortcut to open any panel — including <strong>Export</strong> and <strong>Print</strong> — without reaching for the topbar.</p>
  //   `,
  //   beforeShowPromise: () => {
  //     store.closePanel('filters')
  //     return delay(80)
  //   },
  //   attachTo: { element: '.map-panel-launchers', on: 'left' },
  //   buttons: navBtns(),
  // })

  // STEP 13 — Profile
  tour.addStep({
    id: 'profile',
    title: 'Your Profile',
    text: `
      <p>Click your <strong>profile avatar</strong> to access Settings, Keyboard Shortcuts, and the GIS Log — a full history of every tool operation.</p>
      <p style="margin-top:10px;font-size:12px;color:var(--text-muted)">The sample layers will be removed when you close this tour.</p>
    `,
    attachTo: { element: '.profile-badge-btn, .profile-signin-btn', on: 'bottom-end' },
    buttons: lastBtns,
  })

  // ── Cleanup on finish/cancel ───────────────────────────────────────────────

  const cleanup = () => {
    localStorage.setItem(TOUR_KEY, '1')
    const s = useAppStore.getState()
    // Clear any selected features so the highlight ring disappears
    s.clearSelection()
    // Remove the tour sample layers
    s.layers.filter((l) => l._tourLayer).forEach((l) => s.removeLayer(l.id))
    // Close panels opened during the tour
    ;['attributes', 'gistools', 'filters'].forEach((k) => s.closePanel(k))
  }

  tour.on('complete', cleanup)
  tour.on('cancel', cleanup)

  tour.start()
  return tour
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY)
}
