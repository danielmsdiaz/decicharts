import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspace, type WorkspacePointSnapshot } from '@/features/analyses/workspace-context'
import { createFigureBlob } from '@/features/charts/export'
import { reportFormats } from '@/features/charts/report'
import { assetFor, type FigureSource, type ReportAsset } from './model'

export interface PickedFigure { asset: ReportAsset; source: FigureSource }
export function ChartPicker({ allowPair, onClose, onInsert }: { allowPair: boolean; onClose: () => void; onInsert: (values: PickedFigure[], paired: boolean) => void }) {
  const workspace = useWorkspace(), dialog = useRef<HTMLDialogElement>(null), id = useId()
  const [points] = useState(() => workspace.capturePoints(workspace.points.map(point => point.key)))
  const [selected, setSelected] = useState<string[]>([]), [paired, setPaired] = useState(allowPair)
  const [page, setPage] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const active = useRef(true)
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.current?.showModal(); dialog.current?.querySelector<HTMLButtonElement>('.dialog-close')?.focus(); active.current = true
    return () => { active.current = false; if (previous?.isConnected) previous.focus() }
  }, [])
  async function insert() {
    setBusy(true); setError('')
    const values: PickedFigure[] = []
    try {
      // Render only the chosen figures, sequentially, from this immutable selection.
      for (const key of selected) {
        const point = points.find(point => point.key === key)!
        const blob = await createFigureBlob(point.dataset, point.view, 'png', 'portrait')
        if (!active.current) { values.forEach(value => URL.revokeObjectURL(value.asset.url)); return }
        values.push({ asset: assetFor(blob, reportFormats.portrait.width * 2, reportFormats.portrait.height * 2), source: { importId: point.importId, pointId: point.key, label: point.dataset.point?.id ?? point.dataset.fileName, version: point.version, view: point.view } })
        await new Promise(resolve => window.setTimeout(resolve, 0))
      }
      onInsert(values, paired); onClose()
    } catch (issue) { values.forEach(value => URL.revokeObjectURL(value.asset.url)); if (active.current) setError(issue instanceof Error ? issue.message : 'Não foi possível inserir os gráficos. Tente novamente.') }
    finally { if (active.current) setBusy(false) }
  }
  return <dialog ref={dialog} className="report-chart-dialog" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="report-chart-header"><div><h2 id={id}>Inserir gráficos</h2><p>{points.length ? 'Escolha os pontos na ordem em que deseja inseri-los.' : 'Importe um arquivo na tela Análise para escolher seus gráficos.'}</p></div><button type="button" className="dialog-close" aria-label="Fechar seleção de gráficos" onClick={onClose}><X /></button></div>
    <div className="report-chart-grid">
      {points.slice(page * 6, (page + 1) * 6).map(point => <ChartChoice key={point.key} point={point} index={selected.indexOf(point.key)} disabled={busy} onToggle={() => {
        if (!selected.includes(point.key) && selected.length >= 50) { setError('Selecione até 50 gráficos por vez.'); return }
        setError(''); setSelected(values => values.includes(point.key) ? values.filter(key => key !== point.key) : [...values, point.key])
      }} />)}
    </div>
    {points.length > 6 && <div className="report-picker-pagination"><Button variant="ghost" disabled={page === 0 || busy} onClick={() => setPage(value => value - 1)}>Anteriores</Button><span>{page + 1} de {Math.ceil(points.length / 6)}</span><Button variant="ghost" disabled={(page + 1) * 6 >= points.length || busy} onClick={() => setPage(value => value + 1)}>Próximos</Button></div>}
    {error && <p role="alert" className="notice error">{error}</p>}
    <div className="report-chart-footer">{allowPair && <label className="report-pair-option"><input type="checkbox" checked={paired} disabled={busy} onChange={event => setPaired(event.target.checked)} />Dois gráficos lado a lado</label>}<Button disabled={!selected.length || busy} onClick={() => void insert()}>{busy ? 'Preparando gráficos…' : `Inserir ${selected.length || ''} ${selected.length === 1 ? 'gráfico' : 'gráficos'}`}</Button></div>
  </dialog>
}

function ChartChoice({ point, index, disabled, onToggle }: { point: WorkspacePointSnapshot; index: number; disabled: boolean; onToggle: () => void }) {
  const [preview, setPreview] = useState(''), [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true, url = ''
    const timer = window.setTimeout(async () => {
      try {
        const { reportSvg } = await import('@/features/charts/export')
        url = URL.createObjectURL(new Blob([reportSvg(point.dataset, point.view, 'portrait')], { type: 'image/svg+xml' }))
        if (active) setPreview(url); else URL.revokeObjectURL(url)
      } catch { if (active) setFailed(true) }
    }, 0)
    return () => { active = false; window.clearTimeout(timer); if (url) URL.revokeObjectURL(url) }
  }, [point])
  const label = point.dataset.point?.id ?? point.dataset.fileName
  return <label className={`report-chart-choice ${index >= 0 ? 'is-selected' : ''}`}><input type="checkbox" aria-label={`Selecionar gráfico ${label}`} checked={index >= 0} disabled={disabled} onChange={onToggle} />
    <div className="report-chart-thumbnail">{preview ? <img src={preview} alt={`Prévia de ${label}`} /> : <span>{failed ? 'Prévia indisponível' : 'Preparando prévia…'}</span>}</div>
    <div className="report-chart-choice-label"><strong>{label}</strong><span>{index >= 0 ? `${index + 1}º na seleção` : `${point.dataset.validRecords.toLocaleString('pt-BR')} medições`}</span></div>
  </label>
}
