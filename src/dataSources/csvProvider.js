// csvProvider — serves user-imported CSV datasets, matching the same
// three-method provider interface every source (mock, this, a future real
// API) implements. See dataSources.config.js for the interface contract.

import { listCsvDatasets, getCsvDataset } from './csvDatasets'

const csvProvider = {
  id: 'csv',
  label: 'Imported Files',

  async listDatasets() {
    const datasets = await listCsvDatasets()
    return datasets.map(({ id, name, rowCount }) => ({
      id,
      label: name,
      description: `${rowCount} row${rowCount !== 1 ? 's' : ''}`,
    }))
  },

  async getSchema(datasetId) {
    const dataset = await getCsvDataset(datasetId)
    return dataset?.fields || []
  },

  async fetch(datasetId) {
    const dataset = await getCsvDataset(datasetId)
    if (!dataset) throw new Error('This imported file no longer exists — pick a different data source')
    return {
      rows: dataset.rows,
      fields: dataset.fields,
      fetchedAt: new Date().toISOString(),
    }
  },

  subscribe: null,
}

export default csvProvider
