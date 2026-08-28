import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import { computeBbox, importFile } from './importManager'

const LAYER_COLORS = [
  '#00d4c8', '#0099ff', '#7c3aed', '#f59e0b', '#ef4444',
  '#22c55e', '#ec4899', '#f97316', '#06b6d4', '#a855f7',
]

let colorIdx = 0

export default function useFileImport() {
  const { addLayer, addToast, setLoading, setPendingFitBounds } = useAppStore()
  const [coordinateDialog, setCoordinateDialog] = useState(null)

  const requestCoordinateFields = (dialogData) => new Promise((resolve, reject) => {
    setCoordinateDialog({
      ...dialogData,
      onConfirm: (selection) => {
        setCoordinateDialog(null)
        resolve(selection)
      },
      onCancel: () => {
        setCoordinateDialog(null)
        reject(new Error('Import cancelled'))
      },
    })
  })

  const SIZE_WARN_MB  = 25
  const SIZE_BLOCK_MB = 50

  const checkFileSize = (file) => new Promise((resolve) => {
    const mb = file.size / 1024 / 1024
    if (mb < SIZE_WARN_MB) { resolve(true); return }

    if (mb >= SIZE_BLOCK_MB) {
      const ok = window.confirm(
        `⚠️ Large file warning\n\n` +
        `"${file.name}" is ${mb.toFixed(1)} MB. Files this large may freeze or crash the browser tab.\n\n` +
        `For best results, consider:\n` +
        `• Simplifying the geometry before importing\n` +
        `• Splitting the file into smaller parts\n` +
        `• Filtering to only the features you need\n\n` +
        `Continue anyway?`
      )
      resolve(ok)
      return
    }

    // 25–50 MB: non-blocking toast warning, proceed automatically
    addToast({
      type: 'warning',
      message: `"${file.name}" is ${mb.toFixed(1)} MB — large files may slow down the app.`,
      duration: 8000,
    })
    resolve(true)
  })

  const handleImport = async (files) => {
    const fileList = Array.from(files || [])
    const tabularExts = new Set(['csv', 'xlsx', 'xls'])
    const tabularFiles = fileList.filter((f) => tabularExts.has(f.name.split('.').pop().toLowerCase()))

    let savedCoordFields = null
    let tabularProcessed = 0

    for (const file of fileList) {
      const ext = file.name.split('.').pop().toLowerCase()
      const isTabular = tabularExts.has(ext)

      let remainingTabularAfterThis = 0
      if (isTabular) {
        tabularProcessed++
        remainingTabularAfterThis = tabularFiles.length - tabularProcessed
      }

      const proceed = await checkFileSize(file)
      if (!proceed) continue

      try {
        setLoading(true, `Importing ${file.name}…`)

        const importOptions = {}
        if (isTabular) {
          if (savedCoordFields) {
            importOptions.coordinateFields = savedCoordFields
          } else {
            importOptions.selectCoordinateFields = async (dialogData) => {
              const selection = await requestCoordinateFields({
                ...dialogData,
                showApplyToAll: remainingTabularAfterThis > 0,
              })
              if (selection.applyToAll) {
                savedCoordFields = { latKey: selection.latKey, lngKey: selection.lngKey }
              }
              return selection
            }
          }
        }

        const result = await importFile(file, importOptions)
        const color = LAYER_COLORS[colorIdx % LAYER_COLORS.length]
        colorIdx += 1
        addLayer({
          name: result.name,
          type: result.type,
          geojson: result.geojson,
          style: { color },
        })
        addToast({ type: 'success', message: `Imported ${result.name} (${result.featureCount} features)` })
        const bbox = computeBbox(result.geojson)
        if (bbox) setPendingFitBounds(bbox)
      } catch (err) {
        if (err.message !== 'Import cancelled') {
          addToast({ type: 'error', message: `Import failed: ${err.message}`, duration: 6000 })
        }
      } finally {
        setLoading(false)
      }
    }
  }

  return {
    handleImport,
    coordinateDialog,
    closeCoordinateDialog: () => coordinateDialog?.onCancel?.(),
    confirmCoordinateDialog: (selection) => coordinateDialog?.onConfirm?.(selection),
  }
}