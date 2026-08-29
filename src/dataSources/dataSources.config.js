// dataSources.config — the data provider registry.
//
// A provider is a plain object with three async methods:
//   listDatasets()          -> [{ id, label, description }]
//   getSchema(datasetId)    -> [{ key, label, type }]
//   fetch(datasetId, params) -> { rows, fields, fetchedAt }
// and an optional `subscribe(datasetId, cb) -> unsubscribe` for live sources.
//
// Datasets are addressed app-wide by a composite string "<providerId>:<datasetId>"
// (see registry.js) — one flat string per widget binding, so export/import
// files and config forms never have to carry two coupled fields.
//
// To add a real API later: write a new file matching this same three-method
// shape (apiProvider.example.js is a commented-out starting point) and add
// it to PROVIDERS below. No widget code changes — useWidgetData.js is the
// only thing that ever calls into a provider.
//
// Unlike pages.config.jsx / panels.config.jsx / widgets.config.jsx, provider
// modules aren't React components, so there's no lazy()/circular-import
// concern here — they're plain data/logic modules imported eagerly.

import mockProvider from './mockProvider'
import csvProvider from './csvProvider'

const PROVIDERS = [
  mockProvider,
  csvProvider,
]

export const PROVIDERS_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]))

export default PROVIDERS
