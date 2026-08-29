// useWidgetData — the single seam between a widget instance and its data.
// A widget component never touches a provider, a fetch, or loading state
// directly — it calls this hook and gets back plain values. Swapping mock
// data for a real API later means writing one new provider file matching
// the interface in dataSources.config.js; this hook and every widget type
// stay exactly as they are.
//
//   const { rows, fields, value, delta, loading, error, refresh } = useWidgetData(instance)
//
// - dataShape 'rows'      (chart, table): `rows`/`fields` are populated.
// - dataShape 'aggregate' (stat):         `value`/`delta` are populated,
//                                         reduced from `rows` by binding.aggregate.
// - dataShape 'none'      (text):         nothing is fetched; all fields are null.
//
// Refresh: fetches on mount and whenever the binding changes. If
// binding.refreshInterval (ms) is set, polls on that interval; provider.subscribe
// (for a future real-time source) is preferred over polling when present.
// Both are cleaned up on unmount/binding change via the `cancelled` flag and
// timer/unsubscribe teardown below.

import { useEffect, useState } from 'react'
import { WIDGET_TYPES_BY_ID } from './widgets.config'
import { fetchSource, getProvider, parseSourceId } from '../dataSources/registry'

function reduceAggregate(rows, field, aggregate) {
  const values = rows
    .map((r) => Number(r[field]))
    .filter((v) => !Number.isNaN(v))
  if (values.length === 0) return null
  switch (aggregate) {
    case 'avg':   return values.reduce((a, b) => a + b, 0) / values.length
    case 'count': return values.length
    case 'min':   return Math.min(...values)
    case 'max':   return Math.max(...values)
    case 'first': return values[0]
    case 'last':  return values[values.length - 1]
    case 'sum':
    default:      return values.reduce((a, b) => a + b, 0)
  }
}

function computeDelta(value, compareValue) {
  if (value == null || compareValue == null || compareValue === 0) return null
  return ((value - compareValue) / Math.abs(compareValue)) * 100
}

const EMPTY = { rows: [], fields: [], value: null, delta: null }

export default function useWidgetData(instance) {
  const type = WIDGET_TYPES_BY_ID[instance.type]
  const dataShape = type?.dataShape || 'none'
  const binding = instance.binding || {}
  const { sourceId, refreshInterval } = binding

  const [state, setState] = useState({ ...EMPTY, loading: dataShape !== 'none', error: null })
  const [refreshTick, setRefreshTick] = useState(0)

  // Stable string key so the effect only re-runs when the binding fields
  // that actually affect the fetch/reduce change, not on every render.
  const bindingKey = JSON.stringify(binding)

  useEffect(() => {
    if (dataShape === 'none' || !sourceId) {
      setState({ ...EMPTY, loading: false, error: null })
      return
    }

    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))

    const load = async () => {
      try {
        const { rows, fields } = await fetchSource(sourceId)
        if (cancelled) return

        if (dataShape === 'aggregate') {
          const value = binding.valueField ? reduceAggregate(rows, binding.valueField, binding.aggregate) : null
          const compareValue = binding.compareField ? reduceAggregate(rows, binding.compareField, binding.aggregate) : null
          setState({ rows, fields, value, delta: computeDelta(value, compareValue), loading: false, error: null })
        } else {
          setState({ rows, fields, value: null, delta: null, loading: false, error: null })
        }
      } catch (err) {
        if (!cancelled) setState({ ...EMPTY, loading: false, error: err })
      }
    }
    load()

    // Prefer a live subscription over polling when the provider offers one.
    const parsed = parseSourceId(sourceId)
    const provider = parsed ? getProvider(parsed.providerId) : null
    let unsubscribe = null
    if (provider?.subscribe) {
      unsubscribe = provider.subscribe(parsed.datasetId, () => { if (!cancelled) load() })
    } else if (refreshInterval) {
      const id = setInterval(load, refreshInterval)
      unsubscribe = () => clearInterval(id)
    }

    return () => {
      cancelled = true
      unsubscribe?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bindingKey is the intentional dependency; binding/sourceId/refreshInterval are derived from it every render
  }, [bindingKey, dataShape, refreshTick])

  const refresh = () => setRefreshTick((t) => t + 1)

  return { ...state, refresh }
}
