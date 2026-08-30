// apiProvider.example — a commented-out reference implementation of the
// provider interface (see dataSources.config.js), showing the swap-in point
// for a real backend. This file is NOT registered anywhere — copy it,
// rename it, fill in your endpoints, and add it to the PROVIDERS array in
// dataSources.config.js. No other file changes: useWidgetData.js,
// every widget type, and every config form all go through the registry
// (registry.js), never a provider directly, so this is the entire
// integration surface.
//
// The three methods below are called at different times:
//   - listDatasets(): whenever a "Data source" dropdown is populated (every
//     open of a widget's config form). Keep this fast and cheap — it's not
//     memoized by this app, so a slow implementation is felt directly.
//   - getSchema(datasetId): right after a dataset is picked, to populate the
//     field dropdowns (xField, valueField, columns, etc.) with real
//     key/label/type info instead of guessing from a sample of rows the way
//     inferFields.js does for CSV.
//   - fetch(datasetId, params): on mount, on manual refresh, and on every
//     poll tick if the widget's binding.refreshInterval is set. Must return
//     the FULL row set the widget needs (filters/limit are applied
//     client-side afterward, in useWidgetData.js) — this is not a paginated
//     or partial-response contract.
//
// subscribe(datasetId, cb) is optional. If present, useWidgetData prefers it
// over polling entirely (no setInterval is created) — implement it only if
// your backend actually pushes updates (a WebSocket, SSE, a webhook-fed
// store); otherwise leave it null and let refreshInterval-based polling
// handle it, exactly like mockProvider/csvProvider do today.

// const API_BASE = import.meta.env.VITE_API_BASE_URL
//
// async function authedFetch(path, options) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     ...options,
//     headers: { ...options?.headers, Authorization: `Bearer ${getAuthToken()}` },
//   })
//   if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
//   return res.json()
// }
//
// const apiProvider = {
//   id: 'api',
//   label: 'Live API',
//
//   async listDatasets() {
//     // -> [{ id, label, description }]
//     const datasets = await authedFetch('/datasets')
//     return datasets.map((d) => ({ id: d.id, label: d.name, description: d.description }))
//   },
//
//   async getSchema(datasetId) {
//     // -> [{ key, label, type }]  type is 'string' | 'number' | 'date' | 'boolean'
//     return authedFetch(`/datasets/${datasetId}/schema`)
//   },
//
//   async fetch(datasetId, params) {
//     // -> { rows, fields, fetchedAt }
//     const [rows, fields] = await Promise.all([
//       authedFetch(`/datasets/${datasetId}/rows`),
//       authedFetch(`/datasets/${datasetId}/schema`),
//     ])
//     return { rows, fields, fetchedAt: new Date().toISOString() }
//   },
//
//   // Optional — omit or leave null to fall back to refreshInterval polling.
//   // subscribe(datasetId, cb) {
//   //   const socket = new WebSocket(`${API_BASE.replace(/^http/, 'ws')}/datasets/${datasetId}/stream`)
//   //   socket.onmessage = () => cb()   // cb() just triggers a refetch; it takes no payload
//   //   return () => socket.close()
//   // },
//   subscribe: null,
// }
//
// export default apiProvider

export {}
