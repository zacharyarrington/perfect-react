// validators — small composable validation rules for use in useForm's
// `validate` function. Each returns an error message string, or null/undefined
// when the value passes.
//
//   validate: (v) => ({
//     name:  required(v.name) || maxLength(32)(v.name),
//     email: required(v.email) || email(v.email),
//   })

export const required = (message = 'This field is required') => (value) =>
  value === undefined || value === null || String(value).trim() === '' ? message : null

export const minLength = (min, message) => (value) =>
  String(value ?? '').trim().length < min ? (message || `Must be at least ${min} characters`) : null

export const maxLength = (max, message) => (value) =>
  String(value ?? '').length > max ? (message || `Must be ${max} characters or fewer`) : null

export const pattern = (regex, message = 'Invalid format') => (value) =>
  value && !regex.test(value) ? message : null

export const email = (message = 'Enter a valid email address') =>
  pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message)

export const oneOf = (options, message = 'Invalid selection') => (value) =>
  options.includes(value) ? null : message

/** Runs rules in order, returning the first error (or null if all pass). */
export const compose = (...rules) => (value) => {
  for (const rule of rules) {
    const result = rule(value)
    if (result) return result
  }
  return null
}
