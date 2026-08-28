import { useState } from 'react'
import FloatingPanel from './FloatingPanel'
import useAppStore from '../store/useAppStore'
import { IconPrinter, IconLoader, IconCamera, IconCircleCheck, IconCircleX, IconBulb } from '@tabler/icons-react'

/**
 * PrintPanel — exports the current map view as a styled PDF or PNG.
 * Captures the live Mapbox canvas + optional legend + title block.
 */
export default function PrintPanel() {
  const { layers, project } = useAppStore()

  const [title, setTitle]         = useState(project.name || 'ReadyMapGo Map')
  const [subtitle, setSubtitle]   = useState('')
  const [author, setAuthor]       = useState('')
  const [orientation, setOrientation] = useState('landscape') // landscape | portrait
  const [size, setSize]           = useState('letter')        // letter | a4
  const [showLegend, setShowLegend] = useState(true)
  const [showScale, setShowScale]  = useState(true)
  const [showDate, setShowDate]    = useState(true)
  const [showNorth, setShowNorth]  = useState(true)
  const [status, setStatus]        = useState(null)           // null | 'capturing' | 'done' | 'error'
  const [progress, setProgress]    = useState(0)

  // ── Capture map canvas ────────────────────────────────────────────────────

  const captureMapCanvas = () => {
    // Mapbox renders to a <canvas> inside .map-container
    const canvas = document.querySelector('.map-container canvas')
    if (!canvas) return null
    return canvas.toDataURL('image/png', 1.0)
  }

  // ── Build legend data ─────────────────────────────────────────────────────

  const buildLegendItems = () => {
    return layers
      .filter((l) => l.visible)
      .map((l) => ({
        name: l.name,
        color: l.style?.color || '#888',
        type: l.type,
        featureCount: l.geojson?.features?.length || 0,
      }))
  }

  // ── Open print window ─────────────────────────────────────────────────────

  const handlePrint = async () => {
    setStatus('capturing')
    setProgress(10)

    // Small delay to let map finish rendering
    await new Promise((r) => setTimeout(r, 300))
    setProgress(30)

    const mapDataUrl = captureMapCanvas()

    if (!mapDataUrl) {
      setStatus('error')
      return
    }

    setProgress(60)

    const legendItems = buildLegendItems()
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    // Build a print-friendly HTML page
    const printHTML = buildPrintHtml({
      mapDataUrl, title, subtitle, author, dateStr,
      legendItems, showLegend, showScale, showDate, showNorth, orientation, size
    })

    setProgress(80)

    const win = window.open('', '_blank', 'width=1100,height=800')
    if (!win) {
      setStatus('error')
      return
    }

    win.document.write(printHTML)
    win.document.close()

    // Trigger print dialog after images load
    win.onload = () => {
      win.focus()
      setTimeout(() => win.print(), 500)
    }

    setProgress(100)
    setStatus('done')
    setTimeout(() => setStatus(null), 3000)
  }

  // ── PNG export ────────────────────────────────────────────────────────────

  const handleExportPng = async () => {
    setStatus('capturing')

    await new Promise((r) => setTimeout(r, 300))
    const mapDataUrl = captureMapCanvas()

    if (!mapDataUrl) { setStatus('error'); return }

    const a = document.createElement('a')
    a.href = mapDataUrl
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`
    a.click()

    setStatus('done')
    setTimeout(() => setStatus(null), 2000)
  }

  return (
    <FloatingPanel panelKey="print" title="Print / PDF" icon={<IconPrinter size={16} />} defaultWidth={320} defaultHeight={560}>
      {/* Title block */}
      <div className="panel-section">
        <div className="section-label">Map Title Block</div>
        <div className="form-row">
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="label">Subtitle</label>
          <input className="input" placeholder="Optional subtitle…" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="label">Author / Organization</label>
          <input className="input" placeholder="Your name or org…" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
      </div>

      {/* Page settings */}
      <div className="panel-section">
        <div className="section-label">Page Settings</div>
        <div className="form-row-inline">
          <div style={{ flex: 1 }}>
            <label className="label">Size</label>
            <select className="select" value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="letter">Letter (8.5×11)</option>
              <option value="a4">A4</option>
              <option value="legal">Legal (8.5×14)</option>
              <option value="tabloid">Tabloid (11×17)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Orientation</label>
            <select className="select" value={orientation} onChange={(e) => setOrientation(e.target.value)}>
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map elements */}
      <div className="panel-section">
        <div className="section-label">Map Elements</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['showLegend', showLegend, setShowLegend, 'Layer Legend'],
            ['showScale',  showScale,  setShowScale,  'Scale Bar'],
            ['showDate',   showDate,   setShowDate,   'Date'],
            ['showNorth',  showNorth,  setShowNorth,  'North Arrow'],
          ].map(([key, val, setter, label]) => (
            <label key={key} className="toggle">
              <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)} />
              <div className="toggle-track" />
              <span className="toggle-label">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="panel-section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handlePrint}
          disabled={status === 'capturing'}
        >
          {status === 'capturing' ? <><IconLoader size={16} /> Capturing…</> : <><IconPrinter size={16} /> Print / Save PDF</>}
        </button>

        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handleExportPng}
          disabled={status === 'capturing'}
        >
          <IconCamera size={16} /> Export PNG
        </button>

        {status === 'done' && (
          <div style={{ textAlign: 'center', color: 'var(--accent-success)', fontSize: 12 }}>
            <IconCircleCheck size={14} /> Ready — check your browser print dialog
          </div>
        )}
        {status === 'error' && (
          <div style={{ textAlign: 'center', color: 'var(--accent-danger)', fontSize: 12 }}>
            <IconCircleX size={14} /> Could not capture map. Make sure the map is fully loaded.
          </div>
        )}

        {status === 'capturing' && (
          <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-active)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
              transition: 'width 0.3s ease',
              borderRadius: 2,
            }} />
          </div>
        )}
      </div>

      {/* Tip */}
      <div style={{ padding: '8px 14px', color: 'var(--text-muted)', fontSize: 11 }}>
        <IconBulb size={14} /> In the browser print dialog, choose “Save as PDF” to export a PDF file.
        Use "More settings → Background graphics" to include the dark map theme.
      </div>
    </FloatingPanel>
  )
}

// ── Print HTML builder ────────────────────────────────────────────────────────

function buildPrintHtml({ mapDataUrl, title, subtitle, author, dateStr,
  legendItems, showLegend, showScale, showDate, showNorth, orientation, size }) {

  const pageSize = {
    letter: ['8.5in', '11in'],
    a4:     ['210mm', '297mm'],
    legal:  ['8.5in', '14in'],
    tabloid: ['11in', '17in'],
  }[size] || ['8.5in', '11in']

  const [pw, ph] = orientation === 'landscape' ? [pageSize[1], pageSize[0]] : pageSize

  const legendHtml = showLegend && legendItems.length > 0 ? `
    <div class="legend">
      <div class="legend-title">Legend</div>
      ${legendItems.map((item) => `
        <div class="legend-item">
          <div class="legend-swatch" style="background:${item.color};
            ${item.type === 'line' ? `border-radius:0;height:3px;width:20px;margin:auto 0;` :
              item.type === 'polygon' ? `border-radius:2px;` : `border-radius:50%;`}
          "></div>
          <span>${item.name} <span class="feat-count">(${item.featureCount})</span></span>
        </div>
      `).join('')}
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: ${pw} ${ph};
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${pw}; height: ${ph};
      font-family: 'Arial', sans-serif;
      background: #fff;
      color: #1a1a2e;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .header {
      padding: 12px 20px 10px;
      border-bottom: 3px solid #00d4c8;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      flex-shrink: 0;
      background: #080d1a;
      color: #fff;
    }
    .header-left .map-title {
      font-size: 22px;
      font-weight: 700;
      color: #00d4c8;
      letter-spacing: -0.5px;
    }
    .header-left .map-subtitle {
      font-size: 13px;
      color: rgba(255,255,255,0.7);
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
      font-size: 11px;
      color: rgba(255,255,255,0.6);
      line-height: 1.6;
    }
    .map-wrapper {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    .map-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .map-overlays {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .legend {
      position: absolute;
      bottom: 60px;
      right: 12px;
      background: rgba(8,13,26,0.88);
      border: 1px solid rgba(0,212,200,0.3);
      border-radius: 8px;
      padding: 10px 14px;
      min-width: 140px;
      max-width: 200px;
    }
    .legend-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.5);
      margin-bottom: 8px;
      color: #00d4c8;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 5px;
      font-size: 11px;
      color: rgba(255,255,255,0.85);
    }
    .legend-swatch {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    .feat-count { opacity: 0.5; font-size: 10px; }
    .footer {
      padding: 6px 20px;
      border-top: 1px solid rgba(0,212,200,0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      background: #080d1a;
      color: rgba(255,255,255,0.5);
      font-size: 10px;
    }
    .north-arrow {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 36px;
      height: 36px;
      background: rgba(8,13,26,0.85);
      border-radius: 50%;
      border: 1px solid rgba(0,212,200,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .scale-bar {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(8,13,26,0.85);
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 10px;
      color: rgba(255,255,255,0.7);
      border: 1px solid rgba(0,212,200,0.2);
      font-family: monospace;
    }
    @media print {
      html, body { width: ${pw}; height: ${ph}; }
      .header, .footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="map-title">${title}</div>
      ${subtitle ? `<div class="map-subtitle">${subtitle}</div>` : ''}
    </div>
    <div class="header-right">
      ${author ? `<div>${author}</div>` : ''}
      ${showDate ? `<div>${dateStr}</div>` : ''}
      <div style="color:#00d4c8;font-weight:600;font-size:12px;margin-top:2px;">ReadyMapGo</div>
    </div>
  </div>

  <div class="map-wrapper">
    <img src="${mapDataUrl}" alt="Map" />
    <div class="map-overlays">
      ${showNorth ? `<div class="north-arrow">🧭</div>` : ''}
      ${legendHtml}
      ${showScale ? `<div class="scale-bar">Scale varies by zoom level</div>` : ''}
    </div>
  </div>

  <div class="footer">
    <span>Generated by ReadyMapGo • readymapgo.app</span>
    <span>Coordinate System: WGS 84 (EPSG:4326)</span>
    <span>${showDate ? dateStr : ''}</span>
  </div>
</body>
</html>`
}
