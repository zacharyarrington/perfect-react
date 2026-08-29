// mockProvider — built-in demo datasets. This is the data every widget
// binds to out of the box, so a fresh install has something real to look
// at. The datasets here are the same ones the very first hardcoded
// DashboardPage used, just promoted into a real, swappable data source.
//
// This file is the reference shape for any future provider (see
// dataSources.config.js and apiProvider.example.js): listDatasets,
// getSchema, and fetch are the only three methods a provider must supply.

import { inferFields } from './inferFields'

const DATASETS = {
  weekly_signups: {
    id: 'weekly_signups',
    label: 'Weekly Signups & Churn',
    description: 'New signups vs. churned users, by week.',
    rows: [
      { week: 'W1', signups: 84, churn: 12 },
      { week: 'W2', signups: 102, churn: 9 },
      { week: 'W3', signups: 91, churn: 15 },
      { week: 'W4', signups: 128, churn: 11 },
      { week: 'W5', signups: 143, churn: 8 },
      { week: 'W6', signups: 137, churn: 14 },
    ],
  },
  daily_traffic: {
    id: 'daily_traffic',
    label: 'Daily Traffic',
    description: 'Site visits and sessions for the current week.',
    rows: [
      { day: 'Mon', visits: 1240, sessions: 860 },
      { day: 'Tue', visits: 1480, sessions: 1010 },
      { day: 'Wed', visits: 1390, sessions: 940 },
      { day: 'Thu', visits: 1610, sessions: 1150 },
      { day: 'Fri', visits: 1550, sessions: 1080 },
      { day: 'Sat', visits: 980, sessions: 620 },
      { day: 'Sun', visits: 890, sessions: 570 },
    ],
  },
  traffic_sources: {
    id: 'traffic_sources',
    label: 'Traffic Sources',
    description: 'Where visits came from this month.',
    rows: [
      { name: 'Direct', value: 4120 },
      { name: 'Search', value: 3380 },
      { name: 'Referral', value: 1490 },
      { name: 'Social', value: 780 },
      { name: 'Email', value: 460 },
    ],
  },
  recent_activity: {
    id: 'recent_activity',
    label: 'Recent Activity',
    description: 'A log of recent account events.',
    rows: [
      { event: 'User signed up', actor: 'riley@example.com', status: 'ok', when: '2 min ago' },
      { event: 'Report exported', actor: 'sam@example.com', status: 'ok', when: '18 min ago' },
      { event: 'Payment failed', actor: 'jo@example.com', status: 'error', when: '1 hr ago' },
      { event: 'Role changed to Editor', actor: 'admin', status: 'ok', when: '2 hrs ago' },
      { event: 'Sync retried', actor: 'system', status: 'warning', when: '3 hrs ago' },
    ],
  },
}

const mockProvider = {
  id: 'mock',
  label: 'Demo Data',

  async listDatasets() {
    return Object.values(DATASETS).map(({ id, label, description }) => ({ id, label, description }))
  },

  async getSchema(datasetId) {
    const dataset = DATASETS[datasetId]
    if (!dataset) return []
    return inferFields(dataset.rows)
  },

  async fetch(datasetId) {
    const dataset = DATASETS[datasetId]
    if (!dataset) throw new Error(`Unknown demo dataset "${datasetId}"`)
    return {
      rows: dataset.rows,
      fields: inferFields(dataset.rows),
      fetchedAt: new Date().toISOString(),
    }
  },

  // No live backend to subscribe to — polling (see useWidgetData.js) is the
  // only refresh mechanism for this provider.
  subscribe: null,
}

export default mockProvider
