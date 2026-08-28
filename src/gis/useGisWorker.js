import { useEffect, useRef, useCallback } from 'react'
import GisWorker from './gisWorker?worker'

export default function useGisWorker() {
  const workerRef  = useRef(null)
  const pendingRef = useRef({})   // id → { resolve, reject }
  const counterRef = useRef(0)

  useEffect(() => {
    const worker = new GisWorker()
    workerRef.current = worker

    worker.onmessage = ({ data }) => {
      const { id, result, error } = data
      const pending = pendingRef.current[id]
      if (!pending) return
      delete pendingRef.current[id]
      if (error) pending.reject(new Error(error))
      else       pending.resolve(result)
    }

    worker.onerror = (e) => {
      // Reject all in-flight calls if the worker crashes
      const msg = e.message || 'GIS worker crashed'
      for (const { reject } of Object.values(pendingRef.current)) reject(new Error(msg))
      pendingRef.current = {}
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const runOperation = useCallback((tool, payload) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('GIS worker is not available'))
        return
      }
      const id = `gis_${++counterRef.current}`
      pendingRef.current[id] = { resolve, reject }
      workerRef.current.postMessage({ id, tool, payload })
    })
  }, [])

  return { runOperation }
}
