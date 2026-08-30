// configSchema — the generic renderer that turns a widget type's declarative
// configSchema array (see widgets.config.jsx) into a working form. One
// implementation for all 4 widget types rather than 4 hand-written forms,
// since every type shares the same "pick a source -> field dropdowns
// populate from its schema -> clear selections the new source doesn't have"
// mechanic — the part most likely to have a bug, so it should exist once.
//
// Field kinds:
//   source-select      Field.Select populated from every registered data
//                       source, plus a trailing "+ Import CSV…" sentinel
//                       option — picking it opens a file dialog, imports the
//                       CSV via csvDatasets.js, and auto-selects the new
//                       dataset in this same field so a user who realizes
//                       mid-config that they have no data source never has
//                       to bounce out to the Data Sources panel and back.
//   field-select       Field.Select populated from the CURRENT source's
//                       schema (registry.getSourceSchema), filtered by
//                       fieldType if set.
//   field-multiselect  A checkbox list over the same field options, capped
//                       at `max` (default 4, matching the chart-series
//                       colorblind-safety guidance) with a hint once hit.
//   refresh-interval   Field.Select over a small set of common intervals.
//   text / textarea / select / checkbox / color
//                      map straight onto the matching Field.* component.
//
// visibleWhen(values) hides a field from both render AND validation (a
// hidden required field must never block submit).
//
/* eslint-disable react-refresh/only-export-components -- this file exports
   both the form renderer component and the schema utility functions
   (buildValidate/flattenInstance/splitValues) that WidgetConfigModal.jsx
   needs alongside it; splitting them into a separate file would be pure
   ceremony for functions this tightly coupled to the renderer above. */

import { useEffect, useRef, useState } from 'react'
import Field from '../components/forms/Field'
import { validators } from '../components/forms'
import { listAllSources, getSourceSchema, makeSourceId } from '../dataSources/registry'
import { importCsvFile } from '../dataSources/csvDatasets'
import useAppStore from '../store/useAppStore'
import { CHART_COLORS } from '../components/charts/chartTheme'

const REFRESH_OPTIONS = [
  { value: '', label: 'Off (manual only)' },
  { value: '10000', label: 'Every 10 seconds' },
  { value: '30000', label: 'Every 30 seconds' },
  { value: '60000', label: 'Every minute' },
  { value: '300000', label: 'Every 5 minutes' },
]

const MULTISELECT_DEFAULT_MAX = 4
const IMPORT_CSV_SENTINEL = '__import_csv__'

/** True unless the field declares visibleWhen and it evaluates false for the current form values. */
export function isFieldVisible(field, values) {
  return !field.visibleWhen || field.visibleWhen(values)
}

/** Builds a useForm-compatible validate() from a configSchema array. */
export function buildValidate(schema) {
  return (values) => Object.fromEntries(
    schema
      .filter((f) => isFieldVisible(f, values))
      .map((f) => [f.key, f.required ? validators.compose(validators.required())(values[f.key]) : null])
  )
}

/** Flattens a widget instance's {binding, config} into one values object keyed by schema field key. */
export function flattenInstance(instance) {
  return { ...instance.binding, ...instance.config }
}

/** Splits a flat values object back into {binding, config} per each schema entry's `scope`. */
export function splitValues(schema, values) {
  const binding = {}
  const config = {}
  for (const f of schema) {
    const target = f.scope === 'config' ? config : binding
    target[f.key] = values[f.key]
  }
  return { binding, config }
}

function FieldMultiSelect({ label, value, onChange, options, max = MULTISELECT_DEFAULT_MAX, hint, error }) {
  const selected = value || []
  const atMax = selected.length >= max

  const toggle = (key) => {
    if (selected.includes(key)) onChange(selected.filter((k) => k !== key))
    else if (!atMax) onChange([...selected, key])
  }

  return (
    <div className="form-row">
      {label && <label className="label">{label}</label>}
      <div className="field-multiselect">
        {options.length === 0 ? (
          <span className="field-hint">No fields available — pick a data source first.</span>
        ) : (
          options.map((opt) => (
            <label key={opt.value} className={`field-multiselect-item${!selected.includes(opt.value) && atMax ? ' disabled' : ''}`}>
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                disabled={!selected.includes(opt.value) && atMax}
                onChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          ))
        )}
      </div>
      {error ? (
        <div className="field-error">{error}</div>
      ) : (
        <div className="field-hint">{hint || `Up to ${max} — charts read best with a few series.`}</div>
      )}
    </div>
  )
}

/**
 * Renders a whole configSchema as a form. `form` is a useForm instance built
 * from buildValidate(schema)/flattenInstance(instance). Handles live field-
 * option loading per the current sourceId and clears now-invalid field
 * selections (with a callback so the caller can toast about it) when the
 * source changes.
 */
export default function ConfigSchemaForm({ schema, form, onSourceChanged }) {
  const addToast = useAppStore((s) => s.addToast)
  const [sources, setSources] = useState([])
  const [sourceFields, setSourceFields] = useState([])
  const [importing, setImporting] = useState(false)
  const importRef = useRef(null)
  const pendingSourceFieldKey = useRef(null)
  const sourceId = form.values.sourceId

  const refreshSources = () => listAllSources().then(setSources)
  useEffect(() => { refreshSources() }, [])

  const handleCsvChosen = async (file, sourceFieldKey) => {
    if (!file) return
    setImporting(true)
    try {
      const { dataset } = await importCsvFile(file)
      await refreshSources()
      form.setValue(sourceFieldKey, makeSourceId('csv', dataset.id))
      addToast({ type: 'success', message: `Imported "${dataset.name}" — ${dataset.rowCount} rows` })
    } catch (e) {
      addToast({ type: 'error', message: `Import failed: ${e.message}` })
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  // Reload field options whenever the bound source changes, and drop any
  // field-select/field-multiselect selections that no longer exist on the
  // new source — a stale selection pointing at a field the new source
  // doesn't have would otherwise silently break the widget.
  useEffect(() => {
    let cancelled = false
    if (!sourceId) { setSourceFields([]); return }
    getSourceSchema(sourceId).then((fields) => {
      if (cancelled) return
      setSourceFields(fields)
      const validKeys = new Set(fields.map((f) => f.key))
      let clearedAny = false
      for (const f of schema) {
        if (f.kind === 'field-select' && f.scope !== 'config' && form.values[f.key] && !validKeys.has(form.values[f.key])) {
          form.setValue(f.key, null)
          clearedAny = true
        }
        if (f.kind === 'field-multiselect' && Array.isArray(form.values[f.key])) {
          const filtered = form.values[f.key].filter((k) => validKeys.has(k))
          if (filtered.length !== form.values[f.key].length) {
            form.setValue(f.key, filtered)
            clearedAny = true
          }
        }
      }
      if (clearedAny) onSourceChanged?.()
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the bound source itself changes; form/schema/onSourceChanged are stable for the form's lifetime
  }, [sourceId])

  const fieldOptionsFor = (fieldType) =>
    sourceFields
      .filter((f) => !fieldType || f.type === fieldType)
      .map((f) => ({ value: f.key, label: f.label }))

  return (
    <>
      <input
        ref={importRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={(e) => handleCsvChosen(e.target.files?.[0], pendingSourceFieldKey.current)}
      />
      {schema.filter((f) => isFieldVisible(f, form.values)).map((f) => {
        const fieldProps = form.field(f.key)

        switch (f.kind) {
          case 'source-select':
            return (
              <Field.Select
                key={f.key}
                label={f.label}
                required={f.required}
                hint={importing ? 'Importing…' : f.hint}
                disabled={importing}
                {...fieldProps}
                onChange={(value) => {
                  if (value === IMPORT_CSV_SENTINEL) {
                    pendingSourceFieldKey.current = f.key
                    importRef.current?.click()
                    return
                  }
                  fieldProps.onChange(value)
                }}
                options={[
                  ...sources.map((s) => ({ value: s.sourceId, label: `${s.label} (${s.providerLabel})` })),
                  { value: IMPORT_CSV_SENTINEL, label: '+ Import CSV…' },
                ]}
                placeholder="Choose a data source…"
              />
            )
          case 'field-select':
            return (
              <Field.Select
                key={f.key}
                label={f.label}
                required={f.required}
                hint={f.hint}
                {...fieldProps}
                options={fieldOptionsFor(f.fieldType)}
                placeholder={sourceId ? 'Choose a field…' : 'Pick a data source first'}
                disabled={!sourceId}
              />
            )
          case 'field-multiselect':
            return (
              <FieldMultiSelect
                key={f.key}
                label={f.label}
                hint={f.hint}
                max={f.max}
                value={fieldProps.value}
                error={fieldProps.error}
                onChange={fieldProps.onChange}
                options={fieldOptionsFor(f.fieldType)}
              />
            )
          case 'refresh-interval':
            return (
              <Field.Select
                key={f.key}
                label={f.label}
                hint={f.hint}
                {...fieldProps}
                value={fieldProps.value ? String(fieldProps.value) : ''}
                onChange={(v) => fieldProps.onChange(v ? Number(v) : null)}
                options={REFRESH_OPTIONS}
              />
            )
          case 'color':
            return (
              <Field.Color key={f.key} label={f.label} hint={f.hint} {...fieldProps} options={CHART_COLORS} />
            )
          case 'textarea':
            return <Field.Textarea key={f.key} label={f.label} hint={f.hint} required={f.required} {...fieldProps} />
          case 'checkbox':
            return <Field.Checkbox key={f.key} label={f.label} hint={f.hint} {...fieldProps} />
          case 'select':
            return (
              <Field.Select key={f.key} label={f.label} hint={f.hint} required={f.required} {...fieldProps} options={f.options} />
            )
          case 'text':
          default:
            return <Field.Text key={f.key} label={f.label} hint={f.hint} required={f.required} {...fieldProps} />
        }
      })}
    </>
  )
}
