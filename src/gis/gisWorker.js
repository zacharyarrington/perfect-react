import {
  buffer, intersect, difference, union, dissolveByField,
  simplify, convexHull, voronoi, centroidsOf, pointsInPolygon,
  nearestNeighbor, getFieldStats,
} from './gisOperations'

self.onmessage = ({ data }) => {
  const { id, tool, payload } = data
  try {
    let result
    switch (tool) {
      case 'buffer':
        result = buffer(payload.geojson, payload.distance, payload.units)
        break
      case 'intersect':
        result = intersect(payload.fc1, payload.fc2)
        break
      case 'difference':
        result = difference(payload.fc1, payload.fc2)
        break
      case 'union':
        result = union(payload.geojson)
        break
      case 'dissolve':
        result = dissolveByField(payload.geojson, payload.field)
        break
      case 'simplify':
        result = simplify(payload.geojson, payload.tolerance)
        break
      case 'hull':
        result = convexHull(payload.geojson)
        break
      case 'voronoi':
        result = voronoi(payload.geojson)
        break
      case 'centroids':
        result = centroidsOf(payload.geojson)
        break
      case 'spatial_join':
        result = pointsInPolygon(payload.points, payload.polygons)
        break
      case 'nearest':
        result = nearestNeighbor(payload.sourceFC, payload.targetFC)
        break
      case 'stats':
        result = getFieldStats(payload.geojson, payload.field)
        break
      default:
        throw new Error(`Unknown tool: ${tool}`)
    }
    self.postMessage({ id, result })
  } catch (e) {
    self.postMessage({ id, error: e.message })
  }
}
