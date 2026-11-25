import { useMemo, useState } from 'react'
import { Download, RotateCcw, SlidersHorizontal, Save, Check } from 'lucide-react'
import { DateTime } from 'luxon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MeasurementDataset, TimeRange } from '@/features/measurements/types'
import { fullRange, parseFilter, selectMeasurements } from '@/features/measurements/range'
import { datasetTime, elapsedMilliseconds, levelUnit } from '@/features/measurements/temporal'
import { indicators, ESTIMATE_NOTE } from '@/features/measurements/indicators'
import { TimeSeriesChart } from './TimeSeriesChart'
import { exportChart, reportSvg } from './export'
import { indicatorItems } from './report'
import { ReportSettings } from './ReportSettings'
import { useWorkspace } from '@/features/analyses/workspace-context'
import { HelpTooltip } from '@/components/ui/help-tooltip'

export default function ChartWorkspace({ dataset, dark }: { dataset: MeasurementDataset; dark: boolean }) {
  const workspace = useWorkspace()
  const available = fullRange(dataset.measurements)!
  const view = workspace.view!
  const { title, range } = view
  const relative = dataset.timeBasis === 'elapsed'
  const localInput = (value: number) => relative ? String(value / 1000) : DateTime.fromMillis(value, { zone: dataset.timezone }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS")
  const [startInput, setStartInput] = useState(() => localInput(range.start))
  const [endInput, setEndInput] = useState(() => localInput(range.end))
  const [error, setError] = useState(''), [feedback, setFeedback] = useState('')
  const [exporting, setExporting] = useState(false), [preview, setPreview] = useState(false)
  const visible = useMemo(() => selectMeasurements(dataset.measurements, range), [dataset, range])
  const stats = useMemo(() => indicators(dataset, visible), [dataset, visible])
  const figure = useMemo(() => {
    if (!preview || !stats) return { svg: '', error: '' }
    try { return { svg: reportSvg(dataset, view), error: '' } }
    catch { return { svg: '', error: 'Não foi possível preparar a prévia da figura.' } }
  }, [preview, stats, dataset, view])
  function updateRange(next: TimeRange) {
    workspace.setView({ ...view, range: next }); setStartInput(localInput(next.start)); setEndInput(localInput(next.end)); setError(''); setFeedback('')
  }
  function apply() {
    try {
      const parse = (value: string) => relative ? elapsedMilliseconds(value) : parseFilter(value, dataset.timezone)
      const start = parse(startInput), end = parse(endInput)
      if (start > end) throw new Error('O início deve ser anterior ou igual ao fim do intervalo.')
      if (start < available.start || end > available.end) throw new Error('Escolha um intervalo dentro do período disponível da série.')
      updateRange({ start, end })
    } catch (issue) { setError((issue as Error).message) }
  }
  async function download(format: 'png' | 'svg') {
    setExporting(true); setError(''); setFeedback('')
    try { await exportChart(dataset, range, title.trim() || 'Série temporal de nível sonoro', format, view.report); setFeedback(`Figura ${format.toUpperCase()} preparada para download.`) }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'Não foi possível exportar. Tente novamente.') }
    finally { setExporting(false) }
  }
  return <section className="panel chart-workspace overflow-hidden" aria-labelledby="chart-title">
    <div className="chart-heading"><div><div className="chart-title-row"><h2 id="chart-title" className="text-xl font-semibold tracking-tight">Nível sonoro ao longo do tempo</h2><HelpTooltip label="Como explorar o gráfico">Arraste a faixa inferior para selecionar um período. Ctrl + rolagem amplia o gráfico. Passe o cursor sobre a curva para consultar tempo e nível.</HelpTooltip></div>
      <p className="mt-2 text-sm text-muted-foreground tabular-nums">{dataset.point && <strong>{dataset.point.id} · </strong>}{datasetTime(dataset, range.start)} — {datasetTime(dataset, range.end)}</p>
      <p className="mt-1 text-sm text-muted-foreground"><span data-testid="measurement-count">{visible.length.toLocaleString('pt-BR')}</span> medições no período{!relative && ` · ${dataset.timezone}`}</p>
    </div><div className="chart-actions">
      <Button disabled={workspace.saving || !workspace.dirty} onClick={() => void workspace.save()}>{workspace.saved && !workspace.dirty ? <Check /> : <Save />}{workspace.saving ? 'Salvando…' : workspace.saved && !workspace.dirty ? 'Análise salva' : workspace.saved ? 'Salvar alterações' : 'Salvar análise'}</Button>
      <Button variant="outline" disabled={!stats || exporting} onClick={() => void download('png')}><Download />PNG</Button>
      <Button variant="outline" disabled={!stats || exporting} onClick={() => void download('svg')}><Download />SVG</Button>
    </div></div>
    <div className="chart-body">
      <div className="chart-tools">
      <details className="disclosure chart-settings"><summary><SlidersHorizontal className="size-4" aria-hidden="true" />Ajustar período e título<HelpTooltip label="Sobre o período do gráfico">{relative ? 'Limites em segundos decorridos.' : `Horários em ${dataset.timezone}.`} Os limites são inclusivos. Indicadores e figura exportada usam o mesmo período.</HelpTooltip></summary><div className="mt-5">
        <label className="field max-w-xl">Título do gráfico<Input value={title} maxLength={100} onChange={event => workspace.setView({ ...view, title: event.target.value })} /></label>
        <form onSubmit={event => { event.preventDefault(); apply() }} className="mt-5 flex flex-wrap items-end gap-3">
          <label className="field min-w-0">Início<Input type={relative ? 'number' : 'datetime-local'} step="0.001" value={startInput} onChange={event => setStartInput(event.target.value)} /></label>
          <label className="field min-w-0">Fim<Input type={relative ? 'number' : 'datetime-local'} step="0.001" value={endInput} onChange={event => setEndInput(event.target.value)} /></label>
          <Button type="submit">Aplicar intervalo</Button><Button type="button" variant="outline" onClick={() => updateRange(available)}><RotateCcw />Restaurar</Button>
        </form>
      </div></details>
      <ReportSettings view={view} onChange={workspace.setView} />
      </div>
      {error && <p role="alert" className="notice error mt-4">{error}</p>}
      {workspace.saveError && <p role="alert" className="notice error mt-4">{workspace.saveError}</p>}
      {workspace.saving && <p role="status" className="mt-4 text-sm">Salvando este ponto: {workspace.progress.toLocaleString('pt-BR')} de {dataset.validRecords.toLocaleString('pt-BR')} medições…</p>}
      {workspace.saved && workspace.dirty && !workspace.saving && <p role="status" className="mt-4 text-sm text-primary">Alterações não salvas.</p>}
      {(feedback || exporting) && <p role="status" className="mt-4 text-sm text-muted-foreground">{exporting ? 'Preparando figura em alta resolução…' : feedback}</p>}
      <dl className="chart-stats">{(stats ? indicatorItems(dataset, stats) : [['Menor nível', '—'], ['Média aritmética', '—'], ['Maior nível', '—'], ['Leq estimado', '—']]).map(([label, value]) => <div key={label}><dt>{label}{label.includes('eq') && <HelpTooltip label="Sobre o Leq estimado">{stats?.leq === null ? `Indisponível: ${stats.reason} ` : ''}{ESTIMATE_NOTE}</HelpTooltip>}</dt><dd className="tabular-nums">{value}</dd></div>)}</dl>
    </div>
    {!stats && <p className="notice mx-5 mt-5 sm:mx-7" role="status">Não há medições neste intervalo. Amplie o período ou restaure a série completa.</p>}
    <TimeSeriesChart dataset={dataset} range={range} title={title} dark={dark} onRangeChange={updateRange} />
    <div className="chart-bottom">
      {(dataset.invalidRecords > 0 || dataset.duplicateTimestamps > 0) && <p className="mt-3 text-sm text-muted-foreground">{dataset.invalidRecords} registros inválidos excluídos · {dataset.duplicateTimestamps} tempos repetidos preservados.</p>}
      <details className="disclosure mt-4" onToggle={event => setPreview(event.currentTarget.open)}><summary>Prévia da figura exportada</summary>
        {figure.error && <p role="alert" className="notice error">{figure.error}</p>}
        {figure.svg && <div className="report-preview mt-4" role="img" aria-label="Figura completa de monitoramento; mesmas informações e indicadores apresentados acima" dangerouslySetInnerHTML={{ __html: figure.svg }} />}
      </details>
      <details className="disclosure mt-4"><summary>Consultar medições do intervalo</summary><p className="my-3 text-sm text-muted-foreground">Primeiras 100 de {visible.length.toLocaleString('pt-BR')} medições. Valores originais, sem suavização.</p>
        <div className="table-scroll max-h-72"><table className="data-table"><thead><tr><th>{relative ? 'Tempo decorrido (s)' : `Data e hora · ${dataset.timezone}`}</th><th>Nível sonoro ({levelUnit(dataset)})</th></tr></thead><tbody>{visible.slice(0, 100).map((point, index) => <tr key={index} className="tabular-nums"><td className="whitespace-nowrap">{datasetTime(dataset, point.timestamp)}</td><td>{point.value.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</td></tr>)}</tbody></table></div>
      </details>
    </div>
  </section>
}
