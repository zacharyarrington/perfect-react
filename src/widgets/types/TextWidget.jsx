// TextWidget — static text block. No data binding, so this is already its
// final implementation (not a stage-1 placeholder like the other 3 types).

export default function TextWidget({ instance }) {
  const { body = '', align = 'left' } = instance.config || {}
  return (
    <div className="widget-text" style={{ textAlign: align }}>
      {body ? body.split('\n').map((line, i) => <p key={i}>{line || ' '}</p>) : (
        <p className="widget-text-empty">Click the settings icon to add text…</p>
      )}
    </div>
  )
}
