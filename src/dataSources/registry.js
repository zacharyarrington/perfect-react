// registry — resolves the "<providerId>:<datasetId>" composite sourceId
// strings that widget bindings use, against the provider registry in
// dataSources.config.js. This is the one place that string format is
// parsed/built, so it never has to be duplicated elsewhere.

import PROVIDERS, { PROVIDERS_BY_ID } from './dataSources.config'

export function makeSourceId(providerId, datasetId) {
  return `${providerId}:${datasetId}`
}

export function parseSourceId(sourceId) {
  if (!sourceId) return null
  const idx = sourceId.indexOf(':')
  if (idx === -1) return null
  return { providerId: sourceId.slice(0, idx), datasetId: sourceId.slice(idx + 1) }
}

export function getProvider(providerId) {
  return PROVIDERS_BY_ID[providerId] || null
}

/** Every dataset from every registered provider, as flat { sourceId, label, description, providerLabel } entries — the shape a "Data source" dropdown wants. */
export async function listAllSources() {
  const results = await Promise.all(
    PROVIDERS.map(async (provider) => {
      const datasets = await provider.listDatasets().catch(() => [])
      return datasets.map((d) => ({
        sourceId: makeSourceId(provider.id, d.id),
        label: d.label,
        description: d.description,
        providerLabel: provider.label,
      }))
    })
  )
  return results.flat()
}

/** Field schema for a given sourceId, or [] if the source can't be resolved. */
export async function getSourceSchema(sourceId) {
  const parsed = parseSourceId(sourceId)
  if (!parsed) return []
  const provider = getProvider(parsed.providerId)
  if (!provider) return []
  return provider.getSchema(parsed.datasetId).catch(() => [])
}

/** Fetches { rows, fields, fetchedAt } for a sourceId. Throws if unresolvable. */
export async function fetchSource(sourceId, params) {
  const parsed = parseSourceId(sourceId)
  if (!parsed) throw new Error(`Invalid data source id "${sourceId}"`)
  const provider = getProvider(parsed.providerId)
  if (!provider) throw new Error(`Unknown data provider "${parsed.providerId}"`)
  return provider.fetch(parsed.datasetId, params)
}
