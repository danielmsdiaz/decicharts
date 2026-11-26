import { useEffect, useId, useRef, useState } from 'react'
import { Download, FileImage, FileType2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MeasurementDataset } from '@/features/measurements/types'
import type { ChartView } from '../../../shared/persistence'
import { createFigureBlob, downloadFigure } from './export'
import { defaultReportFormat, reportFormats, reportPixelRatio, type ReportFormat } from './report'
import { LogoInput } from './LogoInput'

const reportFormatKey = 'decicharts-report-format'
const fileTypes = [
  { id: 'png', label: 'PNG', description: 'Imagem para documentos', Icon: FileImage },
  { id: 'svg', label: 'SVG', description: 'Vetor escalável', Icon: FileType2 },
] as const
type FileType = typeof fileTypes[number]['id']
type FigurePreview = { dataset: MeasurementDataset; view: ChartView; format: FileType; aspect: ReportFormat } & (
  { blob: Blob; url: string; error?: never } | { blob?: never; url?: never; error: string }
)

function initialAspect(): ReportFormat {
  try {
    const saved = localStorage.getItem(reportFormatKey)
    if (saved && Object.hasOwn(reportFormats, saved)) return saved as ReportFormat
  } catch { /* The choice still works without browser storage. */ }
  return defaultReportFormat
}

export function FigureExport({ dataset, view, disabled, onStatus, onChange }: {
  dataset: MeasurementDataset
  view: ChartView
  disabled: boolean
  onStatus: (message: string) => void
  onChange: (view: ChartView) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId(), sizeId = useId()
  const [format, setFormat] = useState<FileType>('png')
  const [aspect, setAspect] = useState(initialAspect)
  const [isOpen, setIsOpen] = useState(false)
  const [preview, setPreview] = useState<FigurePreview | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [logoBusy, setLogoBusy] = useState(false)
  const latestView = useRef(view)
  useEffect(() => { latestView.current = view }, [view])
  const { width, height } = reportFormats[aspect]
  const current = preview?.dataset === dataset && preview.view === view && preview.format === format && preview.aspect === aspect ? preview : null

  useEffect(() => {
    if (!isOpen || disabled) return
    let active = true
    const selection = { dataset, view, format, aspect }
    const timer = window.setTimeout(async () => {
      try {
        const blob = await createFigureBlob(dataset, view, format, aspect)
        if (!active) return
        setPreview({ ...selection, blob, url: URL.createObjectURL(blob) })
      } catch {
        if (active) setPreview({ ...selection, error: 'Não foi possível gerar a figura.' })
      }
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [isOpen, disabled, dataset, view, format, aspect, attempt])
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url) }, [preview])

  function open() {
    const element = dialog.current
    if (!element) return
    onStatus('')
    setPreview(null)
    setIsOpen(true)
    element.showModal()
    element.querySelector<HTMLInputElement>('input[name="figure-file-type"]:checked')?.focus()
  }

  function changeAspect(next: ReportFormat) {
    setAspect(next)
    try { localStorage.setItem(reportFormatKey, next) } catch { /* Optional preference only. */ }
  }

  function download() {
    if (!current?.blob || disabled || logoBusy) return
    downloadFigure(dataset, current.blob, format)
    dialog.current?.close()
    onStatus(`Download do ${format.toUpperCase()} iniciado.`)
  }

  return <>
    <Button variant="outline" disabled={disabled} onClick={open} aria-haspopup="dialog"><Download />Exportar figura</Button>
    <dialog ref={dialog} className="export-dialog" aria-labelledby={titleId} onClose={() => { if (!dialog.current?.open) setIsOpen(false) }}>
      <form className="export-dialog-content" onSubmit={event => { event.preventDefault(); download() }}>
        <div className="export-dialog-heading"><span className="export-dialog-icon"><Download aria-hidden="true" /></span><h2 id={titleId}>Exportar figura</h2></div>
        <button type="button" className="dialog-close" aria-label="Fechar exportação" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button>

        <div className="export-dialog-body">
          <div className="export-dialog-options">
            <fieldset className="export-options">
              <legend>Tipo de arquivo</legend>
              <div className="export-choice-grid">
                {fileTypes.map(({ id, label, description, Icon }) => <label key={id} className="export-choice export-file-choice">
                  <input className="sr-only" type="radio" name="figure-file-type" value={id} checked={format === id} onChange={() => { setPreview(null); setFormat(id) }} />
                  <Icon aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span>
                </label>)}
              </div>
            </fieldset>

            <fieldset className="export-options" aria-describedby={format === 'png' ? sizeId : undefined}>
              <legend>Proporção da figura</legend>
              <div className="export-choice-grid export-choice-grid-aspects">
                {(Object.keys(reportFormats) as ReportFormat[]).map(key => <label key={key} className="export-choice export-aspect-choice" data-aspect={key}>
                  <input className="sr-only" type="radio" name="figure-aspect" value={key} checked={aspect === key} onChange={() => { setPreview(null); changeAspect(key) }} />
                  <span className="export-aspect-icon" aria-hidden="true"><span /></span>
                  <strong>{reportFormats[key].label}</strong><small>{reportFormats[key].ratio}</small>
                </label>)}
              </div>
              {format === 'png' && <p id={sizeId} className="export-file-size">{width * reportPixelRatio} × {height * reportPixelRatio} px</p>}
            </fieldset>
            <LogoInput value={view.report?.logo} onBusyChange={setLogoBusy} onChange={logo => {
              const currentView = latestView.current
              onChange({ ...currentView, report: { ...currentView.report, logo } })
            }} />
          </div>
          <section className="export-preview">
            <h3>Prévia da figura</h3>
            <div className="export-preview-stage">
              {current?.url ? <img src={current.url} alt="Prévia da figura a baixar" /> : current?.error ? <div className="export-preview-error">
                <p role="alert">{current.error}</p>
                <Button variant="outline" size="sm" onClick={() => { setPreview(null); setAttempt(value => value + 1) }}>Tentar novamente</Button>
              </div> : <p role="status">Preparando prévia…</p>}
            </div>
          </section>
        </div>

        <div className="export-dialog-actions">
          <Button variant="ghost" onClick={() => dialog.current?.close()}>Cancelar</Button>
          <Button type="submit" disabled={!current?.blob || disabled || logoBusy}><Download />Baixar {format.toUpperCase()}</Button>
        </div>
      </form>
    </dialog>
  </>
}
