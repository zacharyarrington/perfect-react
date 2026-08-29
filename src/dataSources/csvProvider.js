// csvProvider — serves user-imported CSV datasets.
//
// STUB for now — CSV import (parsing, storage, the Data Sources panel) is
// its own build stage. This satisfies the provider interface today so
// dataSources.config.js can register it and the picker/config UI won't
// break; listDatasets() simply returns nothing until the real
// implementation lands.

const csvProvider = {
  id: 'csv',
  label: 'Imported Files',

  async listDatasets() {
    return []
  },

  async getSchema() {
    return []
  },

  async fetch(datasetId) {
    throw new Error(`No imported dataset "${datasetId}" — CSV import isn't wired up yet`)
  },

  subscribe: null,
}

export default csvProvider
