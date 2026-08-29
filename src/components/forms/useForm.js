// useForm — small controlled-form hook: values, per-field errors, touched
// state, and a submit wrapper that validates before calling your handler.
//
//   const form = useForm({
//     initialValues: { name: '', role: 'viewer' },
//     validate: (values) => ({
//       name: !values.name.trim() ? 'Name is required' : null,
//     }),
//     onSubmit: async (values) => { await createUser(values) },
//   })
//
//   <Field.Text label="Name" {...form.field('name')} />
//   <button onClick={form.handleSubmit} disabled={form.submitting}>Save</button>
//
// `field(key)` spreads exactly what a Field component needs: value, error
// (only once the field has been touched or a submit was attempted), and
// onChange/onBlur wired to this hook's state.

import { useCallback, useState } from 'react'

export default function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const runValidation = useCallback((vals) => validate?.(vals) || {}, [validate])

  const setValue = useCallback((key, value) => {
    setValues((v) => {
      const next = { ...v, [key]: value }
      setErrors(runValidation(next))
      return next
    })
  }, [runValidation])

  const setFieldTouched = useCallback((key) => {
    setTouched((t) => ({ ...t, [key]: true }))
  }, [])

  const reset = useCallback((next = initialValues) => {
    setValues(next)
    setErrors({})
    setTouched({})
    setSubmitError(null)
  }, [initialValues])

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault?.()
    const nextErrors = runValidation(values)
    setErrors(nextErrors)
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])))
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit?.(values)
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong')
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [values, runValidation, onSubmit])

  /** Props to spread onto a Field component for a given key. */
  const field = useCallback((key) => ({
    name: key,
    value: values[key],
    error: touched[key] ? errors[key] : null,
    onChange: (value) => setValue(key, value),
    onBlur: () => setFieldTouched(key),
  }), [values, touched, errors, setValue, setFieldTouched])

  return {
    values, errors, touched, submitting, submitError,
    isValid: !Object.values(runValidation(values)).some(Boolean),
    field, setValue, reset, handleSubmit,
  }
}
