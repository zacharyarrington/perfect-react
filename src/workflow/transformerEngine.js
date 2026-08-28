import * as turf from '@turf/turf'

// ── Transformer registry ─────────────────────────────────────────────────────
// Each entry defines a transformer type:
//   label      — display name
//   category   — grouping in the palette
//   color      — accent color for the node header
//   icon       — emoji used in the node header
//   inputs     — named input ports  (array of { name, label })
//   outputs    — named output ports (array of { name, label })
//   params     — param schema [{ key, label, type, options?, default? }]
//   run(inputs, params, layers) → FeatureCollection (throws on error)

export const TRANSFORMER_DEFS = {
  // ── Source ────────────────────────────────────────────────
  reader: {
    label: 'Layer Reader',
    category: 'Source',
    color: '#0ea5e9',
    icon: '📥',
    inputs: [],
    outputs: [{ name: 'output', label: 'Features' }],
    params: [
      { key: 'layerId', label: 'Layer', type: 'layer' },
    ],
    run: (_inputs, params, layers) => {
      const layer = layers.find((l) => l.id === params.layerId)
      if (!layer) throw new Error('Layer Reader: no layer selected or layer was deleted')
      const fc = layer.geojson
      if (!fc?.features?.length) throw new Error(`Layer Reader: layer "${layer.name}" has no features`)
      return fc
    },
  },

  // ── Output ────────────────────────────────────────────────
  writer: {
    label: 'Layer Writer',
    category: 'Output',
    color: '#22c55e',
    icon: '📤',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [],
    params: [
      { key: 'layerName', label: 'Output layer name', type: 'string', default: 'Workflow Output' },
    ],
    run: (inputs) => {
      const fc = inputs.input
      if (!fc?.features?.length) throw new Error('Layer Writer: no features received — check upstream transformers')
      return fc
    },
  },

  // ── Attribute ops ─────────────────────────────────────────
  filter: {
    label: 'Filter',
    category: 'Attribute',
    color: '#f59e0b',
    icon: '🔽',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [
      { name: 'passed', label: 'Passed' },
      { name: 'failed', label: 'Failed' },
    ],
    params: [
      { key: 'field',    label: 'Field',    type: 'field' },
      { key: 'operator', label: 'Operator', type: 'select',
        options: ['=', '!=', '>', '>=', '<', '<=', 'contains', 'starts with', 'ends with', 'is null', 'is not null'],
        default: '=' },
      { key: 'value', label: 'Value', type: 'string' },
    ],
    run: (inputs, params) => {
      const fc = inputs.input
      if (!fc) throw new Error('Filter: no input features')
      const { field, operator, value } = params
      if (!field) throw new Error('Filter: no field specified')

      const passed = []
      const failed = []
      for (const f of fc.features) {
        const fv = f.properties?.[field]
        let match = false
        const strFv = String(fv ?? '').toLowerCase()
        const strVal = String(value ?? '').toLowerCase()
        switch (operator) {
          case '=':           match = fv == value; break // eslint-disable-line
          case '!=':          match = fv != value; break // eslint-disable-line
          case '>':           match = Number(fv) > Number(value); break
          case '>=':          match = Number(fv) >= Number(value); break
          case '<':           match = Number(fv) < Number(value); break
          case '<=':          match = Number(fv) <= Number(value); break
          case 'contains':    match = strFv.includes(strVal); break
          case 'starts with': match = strFv.startsWith(strVal); break
          case 'ends with':   match = strFv.endsWith(strVal); break
          case 'is null':     match = fv === null || fv === undefined || fv === ''; break
          case 'is not null':  match = fv !== null && fv !== undefined && fv !== ''; break
          default:             match = false
        }
        ;(match ? passed : failed).push(f)
      }
      // Return both ports; the execution engine picks the right one per edge
      return {
        passed: { type: 'FeatureCollection', features: passed },
        failed: { type: 'FeatureCollection', features: failed },
      }
    },
  },

  fieldCalculator: {
    label: 'Field Calculator',
    category: 'Attribute',
    color: '#f59e0b',
    icon: '🧮',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [{ name: 'output', label: 'Features' }],
    params: [
      { key: 'fieldName',   label: 'New/target field', type: 'field-or-new' },
      { key: 'expression',  label: 'Expression (JS)', type: 'string',
        default: 'props.area * 2',
        hint: 'props.fieldName, geom, turf, index' },
    ],
    run: (inputs, params) => {
      const fc = inputs.input
      if (!fc) throw new Error('Field Calculator: no input features')
      const { fieldName, expression } = params
      if (!fieldName) throw new Error('Field Calculator: field name is required')
      if (!expression) throw new Error('Field Calculator: expression is required')

      // eslint-disable-next-line no-new-func
      const fn = new Function('props', 'geom', 'turf', 'index', `"use strict"; return (${expression})`)
      const features = fc.features.map((f, index) => {
        let val
        try {
          val = fn(f.properties || {}, f.geometry, turf, index)
        } catch (e) {
          val = null
        }
        return { ...f, properties: { ...f.properties, [fieldName]: val } }
      })
      return { type: 'FeatureCollection', features }
    },
  },

  fieldRemover: {
    label: 'Field Remover',
    category: 'Attribute',
    color: '#f59e0b',
    icon: '🗑️',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [{ name: 'output', label: 'Features' }],
    params: [
      { key: 'fields', label: 'Fields to remove', type: 'field-multi' },
    ],
    run: (inputs, params) => {
      const fc = inputs.input
      if (!fc) throw new Error('Field Remover: no input features')
      const drop = new Set((params.fields || '').split(',').map((s) => s.trim()).filter(Boolean))
      const features = fc.features.map((f) => {
        const props = { ...f.properties }
        for (const k of drop) delete props[k]
        return { ...f, properties: props }
      })
      return { type: 'FeatureCollection', features }
    },
  },

  attributeRenamer: {
    label: 'Attribute Renamer',
    category: 'Attribute',
    color: '#f59e0b',
    icon: '✏️',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [{ name: 'output', label: 'Features' }],
    params: [
      { key: 'oldName', label: 'Old field name', type: 'field' },
      { key: 'newName', label: 'New field name', type: 'string' },
    ],
    run: (inputs, params) => {
      const fc = inputs.input
      if (!fc) throw new Error('Attribute Renamer: no input features')
      const { oldName, newName } = params
      if (!oldName || !newName) throw new Error('Attribute Renamer: both field names are required')
      const features = fc.features.map((f) => {
        const props = { ...f.properties }
        if (oldName in props) {
          props[newName] = props[oldName]
          delete props[oldName]
        }
        return { ...f, properties: props }
      })
      return { type: 'FeatureCollection', features }
    },
  },

  // ── Spatial ops ───────────────────────────────────────────
  bufferer: {
    label: 'Bufferer',
    category: 'Spatial',
    color: '#8b5cf6',
    icon: '⭕',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [{ name: 'output', label: 'Buffered' }],
    params: [
      { key: 'distance',      label: 'Distance',             type: 'number', default: 1 },
      { key: 'distanceField', label: 'Or: distance field',   type: 'field-numeric-optional',
        hint: 'Per-feature distance from this numeric field' },
      { key: 'units',         label: 'Units',                type: 'select',
        options: ['kilometers', 'miles', 'meters', 'feet', 'degrees'], default: 'kilometers' },
    ],
    run: (inputs, params) => {
      const fc = inputs.input
      if (!fc) throw new Error('Bufferer: no input features')
      const units = params.units || 'kilometers'
      // Per-feature distance field takes precedence over fixed distance
      if (params.distanceField) {
        const features = fc.features.map((f) => {
          const d = Number(f.properties?.[params.distanceField])
          if (isNaN(d) || d === 0) return null
          try { return turf.buffer(f, d, { units }) } catch { return null }
        }).filter(Boolean).flatMap((r) => r.features || [r])
        if (!features.length) throw new Error('Bufferer: distance field produced no output')
        return { type: 'FeatureCollection', features }
      }
      const dist = Number(params.distance)
      if (isNaN(dist) || dist === 0) throw new Error('Bufferer: distance must be a non-zero number')
      const result = turf.buffer(fc, dist, { units })
      if (!result?.features?.length) throw new Error('Bufferer: produced no output')
      return result
    },
  },

  clipper: {
    label: 'Clipper',
    category: 'Spatial',
    color: '#8b5cf6',
    icon: '✂️',
    inputs: [
      { name: 'input',    label: 'Features to clip' },
      { name: 'clipper',  label: 'Clip boundary' },
    ],
    outputs: [
      { name: 'inside',  label: 'Inside' },
      { name: 'outside', label: 'Outside' },
    ],
    params: [],
    run: (inputs) => {
      const fc     = inputs.input
      const clipFC = inputs.clipper
      if (!fc)     throw new Error('Clipper: missing input features')
      if (!clipFC) throw new Error('Clipper: missing clip boundary layer')

      const clipPolys = clipFC.features.filter(
        (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
      )
      if (!clipPolys.length) throw new Error('Clipper: clip boundary must contain polygons')

      const inside  = []
      const outside = []

      for (const f of fc.features) {
        let clipped = null
        for (const cp of clipPolys) {
          try {
            const result = turf.intersect(turf.featureCollection([f, cp]))
            if (result) { clipped = result; break }
          } catch {}
        }
        if (clipped) {
          inside.push({ ...clipped, properties: f.properties })
        } else {
          outside.push(f)
        }
      }

      return {
        inside:  { type: 'FeatureCollection', features: inside },
        outside: { type: 'FeatureCollection', features: outside },
      }
    },
  },

  dissolver: {
    label: 'Dissolver',
    category: 'Spatial',
    color: '#8b5cf6',
    icon: '🫧',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [{ name: 'output', label: 'Dissolved' }],
    params: [
      { key: 'field', label: 'Dissolve by field (blank = all)', type: 'field-optional' },
    ],
    run: (inputs, params) => {
      const fc = inputs.input
      if (!fc) throw new Error('Dissolver: no input features')
      if (params.field) {
        return turf.dissolve(fc, { propertyName: params.field })
      }
      // Dissolve all into one
      const polys = fc.features.filter(
        (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
      )
      if (!polys.length) throw new Error('Dissolver: requires polygon features')
      let merged = polys[0]
      for (let i = 1; i < polys.length; i++) {
        try { merged = turf.union(turf.featureCollection([merged, polys[i]])) } catch {}
      }
      return { type: 'FeatureCollection', features: [merged] }
    },
  },

  centroider: {
    label: 'Centroider',
    category: 'Spatial',
    color: '#8b5cf6',
    icon: '📍',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [{ name: 'output', label: 'Centroids' }],
    params: [],
    run: (inputs) => {
      const fc = inputs.input
      if (!fc) throw new Error('Centroider: no input features')
      const features = fc.features.map((f) => {
        try {
          const c = turf.centroid(f)
          return { ...c, properties: { ...f.properties } }
        } catch { return null }
      }).filter(Boolean)
      return { type: 'FeatureCollection', features }
    },
  },

  // ── Aggregators ───────────────────────────────────────────
  statisticsCalculator: {
    label: 'Statistics Calculator',
    category: 'Aggregator',
    color: '#ec4899',
    icon: '📊',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [{ name: 'output', label: 'Features with stats' }],
    params: [
      { key: 'groupField', label: 'Group by field (blank = all)', type: 'field-optional' },
      { key: 'valueField', label: 'Value field (numeric)',         type: 'field-numeric' },
      { key: 'operations', label: 'Operations',                    type: 'string',
        default: 'count,sum,mean,min,max',
        hint: 'count, sum, mean, min, max, stdev' },
    ],
    run: (inputs, params) => {
      const fc = inputs.input
      if (!fc) throw new Error('Statistics Calculator: no input features')
      const { groupField, valueField, operations = 'count,sum,mean,min,max' } = params
      const ops = operations.split(',').map((s) => s.trim())

      const groups = {}
      for (const f of fc.features) {
        const key = groupField ? String(f.properties?.[groupField] ?? 'null') : '__all__'
        if (!groups[key]) groups[key] = []
        groups[key].push(f)
      }

      const result = []
      for (const [groupVal, features] of Object.entries(groups)) {
        const values = valueField
          ? features.map((f) => Number(f.properties?.[valueField])).filter((v) => !isNaN(v))
          : []
        const props = groupField ? { [groupField]: groupVal } : {}
        if (ops.includes('count'))  props[`${valueField || 'feature'}_count`] = features.length
        if (values.length) {
          const sum  = values.reduce((a, b) => a + b, 0)
          const mean = sum / values.length
          const sorted = [...values].sort((a, b) => a - b)
          if (ops.includes('sum'))   props[`${valueField}_sum`]   = sum
          if (ops.includes('mean'))  props[`${valueField}_mean`]  = mean
          if (ops.includes('min'))   props[`${valueField}_min`]   = sorted[0]
          if (ops.includes('max'))   props[`${valueField}_max`]   = sorted[sorted.length - 1]
          if (ops.includes('stdev')) {
            const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
            props[`${valueField}_stdev`] = Math.sqrt(variance)
          }
        }
        // Use first feature's geometry as representative for the group
        result.push({ ...features[0], properties: props })
      }
      return { type: 'FeatureCollection', features: result }
    },
  },

  // ── Joiners ───────────────────────────────────────────────
  attributeJoiner: {
    label: 'Attribute Joiner',
    category: 'Joiner',
    color: '#06b6d4',
    icon: '🔗',
    inputs: [
      { name: 'primary',   label: 'Primary features' },
      { name: 'secondary', label: 'Join table' },
    ],
    outputs: [
      { name: 'joined',   label: 'Joined' },
      { name: 'unjoined', label: 'Unjoined' },
    ],
    params: [
      { key: 'primaryKey',   label: 'Primary key field',   type: 'field' },
      { key: 'secondaryKey', label: 'Secondary key field', type: 'field' },
      { key: 'joinType',     label: 'Join type', type: 'select',
        options: ['inner', 'left'], default: 'left' },
    ],
    run: (inputs, params) => {
      const primary   = inputs.primary
      const secondary = inputs.secondary
      if (!primary)   throw new Error('Attribute Joiner: missing primary features')
      if (!secondary) throw new Error('Attribute Joiner: missing join table')
      const { primaryKey, secondaryKey, joinType = 'left' } = params
      if (!primaryKey || !secondaryKey) throw new Error('Attribute Joiner: both key fields are required')

      // Build lookup from secondary
      const lookup = {}
      for (const f of secondary.features) {
        const k = f.properties?.[secondaryKey]
        if (k !== null && k !== undefined) lookup[k] = f.properties
      }

      const joined   = []
      const unjoined = []
      for (const f of primary.features) {
        const k = f.properties?.[primaryKey]
        const match = lookup[k]
        if (match) {
          joined.push({ ...f, properties: { ...f.properties, ...match } })
        } else if (joinType === 'left') {
          joined.push(f)
        } else {
          unjoined.push(f)
        }
      }
      return {
        joined:   { type: 'FeatureCollection', features: joined },
        unjoined: { type: 'FeatureCollection', features: unjoined },
      }
    },
  },

  spatialFilter: {
    label: 'Spatial Filter',
    category: 'Joiner',
    color: '#06b6d4',
    icon: '🗺️',
    inputs: [
      { name: 'input',  label: 'Features to test' },
      { name: 'filter', label: 'Filter geometry' },
    ],
    outputs: [
      { name: 'passed', label: 'Passed' },
      { name: 'failed', label: 'Failed' },
    ],
    params: [
      { key: 'relationship', label: 'Relationship', type: 'select',
        options: ['intersects', 'within', 'contains'], default: 'intersects' },
    ],
    run: (inputs, params) => {
      const fc     = inputs.input
      const filterFC = inputs.filter
      if (!fc)       throw new Error('Spatial Filter: missing input features')
      if (!filterFC) throw new Error('Spatial Filter: missing filter geometry')

      const rel = params.relationship || 'intersects'
      const passed = []
      const failed = []

      for (const f of fc.features) {
        let match = false
        for (const fp of filterFC.features) {
          try {
            if (rel === 'intersects' && turf.booleanIntersects(f, fp))     { match = true; break }
            if (rel === 'within'     && turf.booleanWithin(f, fp))         { match = true; break }
            if (rel === 'contains'   && turf.booleanContains(f, fp))       { match = true; break }
          } catch {}
        }
        ;(match ? passed : failed).push(f)
      }
      return {
        passed: { type: 'FeatureCollection', features: passed },
        failed: { type: 'FeatureCollection', features: failed },
      }
    },
  },

  // ── Format converters ─────────────────────────────────────
  geometryTypeFilter: {
    label: 'Geometry Type Filter',
    category: 'Format',
    color: '#14b8a6',
    icon: '🔀',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [
      { name: 'points',   label: 'Points' },
      { name: 'lines',    label: 'Lines' },
      { name: 'polygons', label: 'Polygons' },
    ],
    params: [],
    run: (inputs) => {
      const fc = inputs.input
      if (!fc) throw new Error('Geometry Type Filter: no input features')
      const points   = fc.features.filter((f) => f.geometry?.type === 'Point' || f.geometry?.type === 'MultiPoint')
      const lines    = fc.features.filter((f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString')
      const polygons = fc.features.filter((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
      return {
        points:   { type: 'FeatureCollection', features: points },
        lines:    { type: 'FeatureCollection', features: lines },
        polygons: { type: 'FeatureCollection', features: polygons },
      }
    },
  },

  polygonToLine: {
    label: 'Polygon To Line',
    category: 'Format',
    color: '#14b8a6',
    icon: '🔄',
    inputs: [{ name: 'input', label: 'Polygons' }],
    outputs: [{ name: 'output', label: 'Lines' }],
    params: [],
    run: (inputs) => {
      const fc = inputs.input
      if (!fc) throw new Error('Polygon To Line: no input features')
      const features = fc.features.map((f) => {
        try { return turf.polygonToLine(f) } catch { return null }
      }).filter(Boolean)
      return { type: 'FeatureCollection', features }
    },
  },

  simplifier: {
    label: 'Simplifier',
    category: 'Format',
    color: '#14b8a6',
    icon: '📐',
    inputs: [{ name: 'input', label: 'Features' }],
    outputs: [{ name: 'output', label: 'Simplified' }],
    params: [
      { key: 'tolerance',    label: 'Tolerance (degrees)', type: 'number', default: 0.01 },
      { key: 'highQuality',  label: 'High quality',        type: 'boolean', default: false },
    ],
    run: (inputs, params) => {
      const fc = inputs.input
      if (!fc) throw new Error('Simplifier: no input features')
      return turf.simplify(fc, {
        tolerance: Number(params.tolerance) || 0.01,
        highQuality: Boolean(params.highQuality),
      })
    },
  },
}

// ── Category groupings for the palette ───────────────────────────────────────
export const TRANSFORMER_CATEGORIES = ['Source', 'Output', 'Attribute', 'Spatial', 'Aggregator', 'Joiner', 'Format']

// ── Edit-time field resolver ──────────────────────────────────────────────────
// Traces the graph upstream from nodeId and returns all field names visible
// at that node's primary input port ('input' or 'primary').
// Returns { all: string[], numeric: string[] } — empty arrays when no upstream layer found.
export function resolveUpstreamFields(nodeId, nodes, edges, layers) {
  // Walk backwards through edges to find all reader ancestors
  const visited   = new Set()
  const queue     = [nodeId]
  const readerIds = []

  while (queue.length) {
    const id = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    const node = nodes.find((n) => n.id === id)
    if (!node) continue
    if (node.type === 'reader') { readerIds.push(id); continue }
    // Push all upstream nodes (via any input edge)
    edges.filter((e) => e.toNodeId === id).forEach((e) => queue.push(e.fromNodeId))
  }

  // Collect all fields from those reader layers
  const allFields     = new Set()
  const numericFields = new Set()

  for (const rid of readerIds) {
    const readerNode = nodes.find((n) => n.id === rid)
    const layerId    = readerNode?.params?.layerId
    if (!layerId) continue
    const layer = layers.find((l) => l.id === layerId)
    const features = layer?.geojson?.features
    if (!features?.length) continue

    // Sample up to 20 features to detect field types
    const sample = features.slice(0, 20)
    const keys   = new Set()
    for (const f of sample) Object.keys(f.properties || {}).forEach((k) => keys.add(k))

    for (const key of keys) {
      allFields.add(key)
      const nums = sample.map((f) => Number(f.properties?.[key])).filter((v) => !isNaN(v))
      if (nums.length / sample.length >= 0.7) numericFields.add(key)
    }
  }

  return { all: [...allFields].sort(), numeric: [...numericFields].sort() }
}

// ── DAG execution engine ─────────────────────────────────────────────────────

function topoSort(nodes, edges) {
  const inDegree = {}
  const adj = {}
  for (const n of nodes) { inDegree[n.id] = 0; adj[n.id] = [] }
  for (const e of edges) {
    adj[e.fromNodeId].push({ to: e.toNodeId, fromPort: e.fromPort, toPort: e.toPort })
    inDegree[e.toNodeId]++
  }
  const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id)
  const order = []
  while (queue.length) {
    const id = queue.shift()
    order.push(id)
    for (const { to } of adj[id]) {
      inDegree[to]--
      if (inDegree[to] === 0) queue.push(to)
    }
  }
  if (order.length !== nodes.length) throw new Error('Workflow has a cycle — check that connections do not loop back')
  return { order, adj }
}

export function executeWorkflow(nodes, edges, layers) {
  if (!nodes.length) throw new Error('Workflow is empty — add at least a Reader and Writer node')

  const writers = nodes.filter((n) => n.type === 'writer')
  if (!writers.length) throw new Error('Workflow has no Layer Writer — add a Writer node to produce output')

  const readers = nodes.filter((n) => n.type === 'reader')
  if (!readers.length) throw new Error('Workflow has no Layer Reader — add a Reader node as the data source')

  const { order, adj } = topoSort(nodes, edges)

  // outputs[nodeId][portName] = FeatureCollection
  const outputs = {}

  const results = []  // { layerName, geojson }

  for (const nodeId of order) {
    const node = nodes.find((n) => n.id === nodeId)
    const def  = TRANSFORMER_DEFS[node.type]
    if (!def) throw new Error(`Unknown transformer type: ${node.type}`)

    // Gather inputs from upstream node outputs
    const inputs = {}
    const incomingEdges = edges.filter((e) => e.toNodeId === nodeId)
    for (const edge of incomingEdges) {
      const upstream = outputs[edge.fromNodeId]
      if (!upstream) continue
      // If the upstream produced a port-keyed object, pick the right port
      const portData = upstream[edge.fromPort] ?? upstream
      inputs[edge.toPort] = portData
    }

    // Execute transformer
    let result
    try {
      result = def.run(inputs, node.params || {}, layers)
    } catch (e) {
      throw new Error(`[${def.label}] ${e.message}`)
    }

    outputs[nodeId] = result

    if (node.type === 'writer') {
      // result is the final FeatureCollection (writer just passes through)
      const fc = result?.output ?? result
      results.push({
        layerName: node.params?.layerName || 'Workflow Output',
        geojson: fc,
      })
    }
  }

  return results
}

// ── Linear step list execution ────────────────────────────────────────────────
// steps: [{ id, type, params }] — each step receives the output of the previous.
// Multi-output transformers (filter, clipper, etc.) pass their 'passed'/'inside'
// port downstream; the secondary port is discarded in linear mode.
export function executeLinearWorkflow(steps, layers) {
  if (!steps.length) throw new Error('No steps — add at least a Reader and one transformer.')

  const readers = steps.filter((s) => s.type === 'reader')
  if (!readers.length) throw new Error('First step must be a Layer Reader.')

  const PASS_PORT = { filter: 'passed', clipper: 'inside', spatialFilter: 'passed', geometryTypeFilter: 'points', attributeJoiner: 'joined' }

  let current = null   // the FeatureCollection flowing through the pipeline
  const log = []       // [{ step, label, count }]

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const def  = TRANSFORMER_DEFS[step.type]
    if (!def) throw new Error(`Step ${i + 1}: unknown transformer "${step.type}"`)

    // Build inputs object — linear model uses named ports
    const inputs = {}
    if (def.inputs.length > 0 && current !== null) {
      // Primary port is always the first input
      inputs[def.inputs[0].name] = current
    }

    let result
    try {
      result = def.run(inputs, step.params || {}, layers)
    } catch (e) {
      throw new Error(`Step ${i + 1} (${def.label}): ${e.message}`)
    }

    // Resolve the output to a FeatureCollection for the next step
    if (step.type === 'writer') {
      // Writer: result is the FC itself (it just validates and passes through)
      const fc = result?.output ?? result
      log.push({ step: i + 1, label: step.params?.layerName || 'Workflow Output', geojson: fc })
      current = fc
    } else if (result && typeof result === 'object' && !result.features) {
      // Multi-port result — pick the primary pass port
      const passKey = PASS_PORT[step.type] || def.outputs[0]?.name || Object.keys(result)[0]
      current = result[passKey] || Object.values(result)[0]
    } else {
      current = result
    }
  }

  if (!log.length) {
    // No writer — return the final output as an anonymous result
    if (!current?.features?.length) throw new Error('Workflow produced no features.')
    log.push({ step: steps.length, label: 'Workflow Output', geojson: current })
  }

  return log  // [{ step, label, geojson }]
}

// ── Linear step field resolver ────────────────────────────────────────────────
// For a step at index `stepIdx`, walks backwards to find the nearest Reader
// and returns that layer's field names.
export function resolveStepFields(stepIdx, steps, layers) {
  for (let i = stepIdx - 1; i >= 0; i--) {
    const step = steps[i]
    if (step.type === 'reader') {
      const layer = layers.find((l) => l.id === step.params?.layerId)
      const features = layer?.geojson?.features
      if (!features?.length) return { all: [], numeric: [] }
      const sample = features.slice(0, 20)
      const keys = new Set()
      for (const f of sample) Object.keys(f.properties || {}).forEach(k => keys.add(k))
      const all = [], numeric = []
      for (const key of [...keys].sort()) {
        all.push(key)
        const nums = sample.map(f => Number(f.properties?.[key])).filter(v => !isNaN(v))
        if (nums.length / sample.length >= 0.7) numeric.push(key)
      }
      return { all, numeric }
    }
  }
  return { all: [], numeric: [] }
}
