// Field — labeled inputs that plug directly into useForm's `field(key)` props.
//
//   <Field.Text label="Name" {...form.field('name')} placeholder="Jane Doe" />
//   <Field.Select label="Role" {...form.field('role')} options={[{ value: 'admin', label: 'Admin' }]} />
//   <Field.Textarea label="Notes" {...form.field('notes')} rows={4} />
//   <Field.Checkbox label="Send invite email" {...form.field('sendInvite')} />
//   <Field.Color label="Avatar color" {...form.field('color')} options={AVATAR_COLORS} />
//   <Field.RichText label="Description" {...form.field('description')} />
//
// Every field accepts: label, error, hint, required, disabled — plus its own
// value/onChange/onBlur wiring. `error` is rendered below the control and
// also flips the control into an error state (red border).

import { IconCheck, IconAlertCircle } from '@tabler/icons-react'
import RichTextEditor from '../ui/RichTextEditor'

function FieldWrapper({ label, error, hint, required, children }) {
  return (
    <div className="form-row">
      {label && (
        <label className="label">
          {label}{required && <span className="field-required">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="field-error"><IconAlertCircle size={12} /> {error}</div>
      ) : hint ? (
        <div className="field-hint">{hint}</div>
      ) : null}
    </div>
  )
}

function Text({
  label, value, onChange, onBlur, error, hint, required, disabled,
  type = 'text', placeholder, maxLength, autoFocus, name,
}) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <input
        className={`input${error ? ' input-error' : ''}`}
        type={type}
        name={name}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </FieldWrapper>
  )
}

function Textarea({
  label, value, onChange, onBlur, error, hint, required, disabled,
  placeholder, rows = 3, maxLength, name,
}) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <textarea
        className={`input textarea${error ? ' input-error' : ''}`}
        name={name}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
      />
    </FieldWrapper>
  )
}

function Select({
  label, value, onChange, onBlur, error, hint, required, disabled,
  options = [], placeholder, name,
}) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <select
        className={`select${error ? ' input-error' : ''}`}
        name={name}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FieldWrapper>
  )
}

function Checkbox({ label, value, onChange, onBlur, error, hint, disabled, name }) {
  return (
    <div className="form-row">
      <label className="toggle">
        <input
          type="checkbox"
          name={name}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
          disabled={disabled}
        />
        <span className="toggle-track" />
        <span className="toggle-label">{label}</span>
      </label>
      {error ? (
        <div className="field-error"><IconAlertCircle size={12} /> {error}</div>
      ) : hint ? (
        <div className="field-hint">{hint}</div>
      ) : null}
    </div>
  )
}

function Color({ label, value, onChange, error, hint, required, options = [] }) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <div className="field-color-picker">
        {options.map((c) => (
          <button
            key={c}
            type="button"
            className={`login-color-swatch${value === c ? ' selected' : ''}`}
            style={{ background: c, width: 26, height: 26 }}
            onClick={() => onChange(c)}
            aria-label={c}
          >
            {value === c && <IconCheck size={11} style={{ color: '#fff' }} />}
          </button>
        ))}
      </div>
    </FieldWrapper>
  )
}

function RichText({
  label, value, onChange, onBlur, error, hint, required, disabled, placeholder,
}) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <RichTextEditor
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        error={Boolean(error)}
      />
    </FieldWrapper>
  )
}

const Field = { Text, Textarea, Select, Checkbox, Color, RichText }
export default Field
