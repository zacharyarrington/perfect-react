// Translates a ReadyMapGo layer style object into Mapbox GL paint/layout properties.
// Handles simple, categorical, graduated, and rule-based symbology modes.
// Returns an array of Mapbox layer configs for the given layer.

// ── Color expression builders ────────────────────────────────────────────────

function buildCategoricalColorExpr(style) {
  if (!style.categoricalValues?.length || !style.categoricalField) return style.color || '#00d4c8'
  const expr = ['match', ['get', style.categoricalField]]
  for (const cv of style.categoricalValues) {
    expr.push(cv.value, cv.color)
  }
  expr.push(style.color || '#888888') // fallback
  return expr
}

function buildGraduatedColorExpr(style) {
  if (!style.graduatedBreaks?.length || !style.graduatedField) return style.color || '#00d4c8'
  const expr = ['step', ['get', style.graduatedField]]
  // First stop color (everything below first break)
  expr.push(style.graduatedBreaks[0].color)
  for (let i = 0; i < style.graduatedBreaks.length - 1; i++) {
    expr.push(style.graduatedBreaks[i].max || style.graduatedBreaks[i + 1].min)
    expr.push(style.graduatedBreaks[i + 1].color)
  }
  return expr
}

function resolveColor(style) {
  if (style.symbologyMode === 'categorical') return buildCategoricalColorExpr(style)
  if (style.symbologyMode === 'graduated') return buildGraduatedColorExpr(style)
  return style.color || '#00d4c8'
}

// ── Rule-based filter helper ─────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
function buildRuleFilter(rule) {
  if (!rule?.filter) return null
  const { field, operator, value } = rule.filter
  if (!field) return null
  switch (operator) {
    case '=':  return ['==', ['get', field], value]
    case '!=': return ['!=', ['get', field], value]
    case '>':  return ['>', ['get', field], Number(value)]
    case '<':  return ['<', ['get', field], Number(value)]
    case 'contains': return ['in', value, ['get', field]]
    default: return null
  }
}

// ── Main builder ─────────────────────────────────────────────────────────────

export function buildMapboxLayers(layer) {
  const { id, style, opacity, type } = layer
  const srcId = layer.sourceId

  const globalOpacity = opacity ?? 1
  const color = resolveColor(style)

  const geoType = type === 'point'   ? 'point'
                : type === 'line'    ? 'line'
                : type === 'polygon' ? 'polygon'
                : 'mixed'

  const layers = []

  // ── Point / Mixed ──
  if (geoType === 'point' || geoType === 'mixed') {
    if (style.type === 'symbol' && style.iconType !== 'circle') {
      layers.push({
        id: `${id}_symbol`,
        type: 'symbol',
        source: srcId,
        filter: ['==', '$type', 'Point'],
        layout: {
          'icon-image':        style.iconType || 'circle-15',
          'icon-size':         style.iconSize || 1.0,
          'icon-allow-overlap': true,
          'text-field':        style.labelField ? ['get', style.labelField] : '',
          'text-size':         11,
          'text-offset':       [0, 1.2],
          'text-anchor':       'top',
          'text-optional':     true,
        },
        paint: {
          'icon-color':   color,
          'icon-opacity': globalOpacity,
          'text-color':   '#ffffff',
          'text-halo-color':  'rgba(0,0,0,0.6)',
          'text-halo-width':  1,
          'text-opacity': globalOpacity,
        },
      })
    } else {
      layers.push({
        id: `${id}_circle`,
        type: 'circle',
        source: srcId,
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius':         style.radius || 6,
          'circle-color':          color,
          'circle-opacity':        globalOpacity,
          'circle-stroke-color':   style.strokeColor || '#ffffff',
          'circle-stroke-width':   style.strokeWidth ?? 1,
          'circle-stroke-opacity': globalOpacity,
        },
      })

      // Label layer
      if (style.labelField) {
        layers.push({
          id: `${id}_label`,
          type: 'symbol',
          source: srcId,
          filter: ['==', '$type', 'Point'],
          layout: {
            'text-field':   ['get', style.labelField],
            'text-size':    11,
            'text-offset':  [0, 1.4],
            'text-anchor':  'top',
            'text-optional': true,
            'text-allow-overlap': false,
          },
          paint: {
            'text-color':       '#ffffff',
            'text-halo-color':  'rgba(0,0,0,0.7)',
            'text-halo-width':  1.5,
            'text-opacity':     globalOpacity,
          },
        })
      }
    }
  }

  // ── Line / Mixed ──
  if (geoType === 'line' || geoType === 'mixed') {
    layers.push({
      id: `${id}_line`,
      type: 'line',
      source: srcId,
      filter: ['all', ['==', '$type', 'LineString']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color':   color,
        'line-width':   style.lineWidth || 2,
        'line-opacity': globalOpacity,
      },
    })
  }

  // ── Polygon / Mixed ──
  if (geoType === 'polygon' || geoType === 'mixed') {
    layers.push({
      id: `${id}_fill`,
      type: 'fill',
      source: srcId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color':   color,
        'fill-opacity': (style.fillOpacity ?? 0.5) * globalOpacity,
      },
    })
    layers.push({
      id: `${id}_outline`,
      type: 'line',
      source: srcId,
      filter: ['==', '$type', 'Polygon'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color':   style.strokeColor || '#ffffff',
        'line-width':   style.strokeWidth ?? 1,
        'line-opacity': globalOpacity,
      },
    })

    // Label layer on polygons
    if (style.labelField) {
      layers.push({
        id: `${id}_poly_label`,
        type: 'symbol',
        source: srcId,
        filter: ['==', '$type', 'Polygon'],
        layout: {
          'text-field':   ['get', style.labelField],
          'text-size':    11,
          'text-anchor':  'center',
          'text-optional': true,
        },
        paint: {
          'text-color':      '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1.5,
          'text-opacity':    globalOpacity,
        },
      })
    }
  }

  return layers
}

// ── Selection highlight layers ────────────────────────────────────────────────
// Rendered on top of each layer to highlight selected features

export function buildSelectionLayers(layer) {
  const { id, type } = layer
  const srcId = layer.sourceId
  const geoType = type === 'point' ? 'point' : type === 'line' ? 'line' : type === 'polygon' ? 'polygon' : 'mixed'
  const layers = []

  if (geoType === 'point' || geoType === 'mixed') {
    layers.push({
      id: `${id}_selected_circle`,
      type: 'circle',
      source: srcId,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius':       10,
        'circle-color':        'rgba(0,212,200,0)',
        'circle-stroke-color': '#00d4c8',
        'circle-stroke-width': 3,
        'circle-opacity':      0,
        'circle-stroke-opacity': 0.9,
      },
    })
  }
  if (geoType === 'line' || geoType === 'mixed') {
    layers.push({
      id: `${id}_selected_line`,
      type: 'line',
      source: srcId,
      filter: ['==', '$type', 'LineString'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#00d4c8',
        'line-width': 5,
        'line-opacity': 0.8,
      },
    })
  }
  if (geoType === 'polygon' || geoType === 'mixed') {
    layers.push({
      id: `${id}_selected_fill`,
      type: 'fill',
      source: srcId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color':   '#00d4c8',
        'fill-opacity': 0.25,
      },
    })
    layers.push({
      id: `${id}_selected_outline`,
      type: 'line',
      source: srcId,
      filter: ['==', '$type', 'Polygon'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color':   '#00d4c8',
        'line-width':   3,
        'line-opacity': 0.9,
      },
    })
  }
  return layers
}

// ── Attribute filter expression ───────────────────────────────────────────────

export function buildFilterExpression(filters) {
  if (!filters || filters.length === 0) return null

  const logic = filters[0]?.groupLogic || 'all'
  const conditions = filters
    .filter((f) => f.field && f.operator)
    .map((f) => {
      const needsValue = !['is null', 'not null'].includes(f.operator)
      if (needsValue && (f.value === undefined || f.value === '')) return null
      switch (f.operator) {
        case '=':        return ['==', ['to-string', ['get', f.field]], String(f.value)]
        case '!=':       return ['!=', ['to-string', ['get', f.field]], String(f.value)]
        case '>':        return ['>', ['get', f.field], Number(f.value)]
        case '>=':       return ['>=', ['get', f.field], Number(f.value)]
        case '<':        return ['<', ['get', f.field], Number(f.value)]
        case '<=':       return ['<=', ['get', f.field], Number(f.value)]
        case 'contains': return ['in', String(f.value).toLowerCase(), ['downcase', ['to-string', ['get', f.field]]]]
        case 'starts':   return ['==', ['slice', ['downcase', ['to-string', ['get', f.field]]], 0, String(f.value).length], String(f.value).toLowerCase()]
        case 'is null':  return ['!', ['has', f.field]]
        case 'not null': return ['has', f.field]
        default:         return null
      }
    })
    .filter(Boolean)

  if (conditions.length === 0) return null
  if (conditions.length === 1) return conditions[0]
  return [logic === 'or' ? 'any' : 'all', ...conditions]
}
