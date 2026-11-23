import { useMemo, useState } from 'react'
import { Download, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { DateTime } from 'luxon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MeasurementDataset, TimeRange } from '@/features/measurements/types'
import { formatTime, fullRange, parseFilter, selectMeasurements, summarize } from '@/features/measurements/range'
import { TimeSeriesChart } from './TimeSeriesChart'
import { exportChart } from './export'

const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 6 })
export default function ChartWorkspace({ dataset, dark }: { dataset: MeasurementDataset; dark: boolean }) {
  const available = fullRange(dataset.measurements)!
  const [range, setRange] = useState<TimeRange>(available)
  const [title, setTitle] = useState('Série temporal de nível sonoro')
  const localInput = (timestamp: number) => DateTime.fromMillis(timestamp, { zone: dataset.timezone }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS")
  const [startInput, setStartInput] = useState(() => localInput(available.start))
  const [endInput, setEndInput] = useState(() => localInput(available.end))
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [exporting, setExporting] = useState(false)
  const visible = useMemo(() => selectMeasurements(dataset.measurements, range), [dataset, range])
  const stats = useMemo(() => summarize(visible), [visible])
  function updateRange(next: TimeRange) { setRange(next); setStartInput(localInput(next.start)); setEndInput(localInput(next.end)); setError(''); setFeedback('') }
  function apply() {
    try {
      const start = parseFilter(startInput, dataset.timezone), end = parseFilter(endInput, dataset.timezone)
      if (start > end) throw new Error('O início deve ser anterior ou igual ao fim do intervalo.')
      if (start < available.start || end > available.end) throw new Error('Escolha um intervalo dentro do período disponível da série.')
      updateRange({ start, end })
    } catch (issue) { setError((issue as Error).message) }
  }
  async function download(format: 'png' | 'svg') {
    setExporting(true); setError(''); setFeedback('')
    try { await exportChart(dataset, range, title.trim() || 'Série temporal de nível sonoro', format); setFeedback(`Gráfico ${format.toUpperCase()} preparado para download.`) }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'Não foi possível exportar o gráfico. Tente novamente.') }
    finally { setExporting(false) }
  }
  return (
    <section className="panel overflow-hidden" aria-labelledby="chart-title">
      <div className="chart-heading">
        <div>
          <h2 id="chart-title" className="text-xl font-semibold tracking-tight">Nível sonoro ao longo do tempo</h2>
          <p className="mt-2 text-sm text-muted-foreground tabular-nums">
            {formatTime(range.start, dataset.timezone, 'dd/MM/yyyy HH:mm:ss')} — {formatTime(range.end, dataset.timezone, 'dd/MM/yyyy HH:mm:ss')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" disabled={!stats || exporting} onClick={() => void download('png')}><Download />PNG</Button>
          <Button variant="outline" disabled={!stats || exporting} onClick={() => void download('svg')}><Download />SVG</Button>
        </div>
      </div>

      <div className="chart-body">
        <details className="disclosure chart-settings">
          <summary><SlidersHorizontal className="size-4" aria-hidden="true" />Ajustar período e título</summary>
          <div className="mt-5">
            <label className="field max-w-xl">Título do gráfico<Input value={title} maxLength={100} onChange={event => setTitle(event.target.value)} /></label>
            <form onSubmit={event => { event.preventDefault(); apply() }} className="mt-5 flex flex-wrap items-end gap-3">
              <label className="field min-w-0 flex-[1_1_240px]">Início<Input type="datetime-local" step="0.001" value={startInput} onChange={event => setStartInput(event.target.value)} /></label>
              <label className="field min-w-0 flex-[1_1_240px]">Fim<Input type="datetime-local" step="0.001" value={endInput} onChange={event => setEndInput(event.target.value)} /></label>
              <Button type="submit" variant="outline">Aplicar intervalo</Button>
              <Button variant="ghost" onClick={() => updateRange(available)}><RotateCcw />Restaurar</Button>
            </form>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Horários em {dataset.timezone}. Os limites são inclusivos; o gráfico e a exportação usam o mesmo período.</p>
          </div>
        </details>
        {error && <p role="alert" className="notice error mt-4">{error}</p>}
        {(feedback || exporting) && <p role="status" className="mt-4 text-sm text-muted-foreground">{exporting ? 'Preparando gráfico em alta resolução…' : feedback}</p>}
        <dl className="chart-stats">
          {[
            ['Medições no período', stats ? number(stats.count) : '0'],
            ['Menor nível', stats ? `${number(stats.min)} ${dataset.unit}` : '—'],
            ['Maior nível', stats ? `${number(stats.max)} ${dataset.unit}` : '—'],
          ].map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd className="tabular-nums">{value}</dd></div>
          ))}
        </dl>
      </div>
      {!stats && <p className="notice mx-5 mt-5 sm:mx-7" role="status">Não há medições neste intervalo. Amplie o período ou restaure a série completa.</p>}
      <TimeSeriesChart dataset={dataset} range={range} title={title} dark={dark} onRangeChange={updateRange} />
      <div className="chart-bottom">
        <p className="text-sm text-muted-foreground">Arraste a faixa para selecionar um período. Ctrl + rolagem amplia o gráfico.</p>
        {(dataset.invalidRecords > 0 || dataset.duplicateTimestamps > 0) && <p className="mt-3 text-sm text-muted-foreground">{number(dataset.invalidRecords)} registros inválidos excluídos · {number(dataset.duplicateTimestamps)} timestamps repetidos preservados.</p>}
        <details className="disclosure mt-4">
          <summary>Consultar medições do intervalo</summary>
          <p className="mb-3 mt-4 text-sm text-muted-foreground">Primeiras 100 de {number(visible.length)} medições, em ordem cronológica. Os pontos originais foram preservados, sem suavização.</p>
          {stats && <p className="mb-3 text-sm text-muted-foreground tabular-nums">Primeira medição: {formatTime(stats.start, dataset.timezone)} · Última medição: {formatTime(stats.end, dataset.timezone)}</p>}
          <div className="table-scroll max-h-72">
            <table className="data-table">
              <thead><tr><th className="sticky top-0">Data e hora · {dataset.timezone}</th><th className="sticky top-0">Nível sonoro ({dataset.unit})</th></tr></thead>
              <tbody>{visible.slice(0, 100).map((point, index) => <tr key={index} className="tabular-nums"><td className="whitespace-nowrap">{formatTime(point.timestamp, dataset.timezone)}</td><td>{number(point.value)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  )
}
