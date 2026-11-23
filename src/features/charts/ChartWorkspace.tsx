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
  return <section className="panel overflow-hidden" aria-labelledby="chart-title">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-6 sm:px-7"><div><h2 id="chart-title" className="text-lg font-semibold">Explore suas medições</h2><p className="mt-1 break-all text-sm text-muted-foreground">{dataset.fileName} · {dataset.sheetName} · {dataset.timezone}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!stats || exporting} onClick={() => void download('png')}><Download />PNG</Button><Button variant="outline" size="sm" disabled={!stats || exporting} onClick={() => void download('svg')}><Download />SVG</Button></div></div>
    <div className="px-5 pt-6 sm:px-7"><label className="field max-w-xl">Título do gráfico<Input value={title} maxLength={100} onChange={event => setTitle(event.target.value)} /></label>
      <form onSubmit={event => { event.preventDefault(); apply() }} className="mt-5 flex flex-wrap items-end gap-3"><label className="field min-w-52 flex-1">Início<Input type="datetime-local" step="0.001" value={startInput} onChange={event => setStartInput(event.target.value)} /></label><label className="field min-w-52 flex-1">Fim<Input type="datetime-local" step="0.001" value={endInput} onChange={event => setEndInput(event.target.value)} /></label><Button type="submit" variant="outline"><SlidersHorizontal />Aplicar intervalo</Button><Button variant="ghost" onClick={() => updateRange(available)}><RotateCcw />Restaurar</Button></form>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Horários em {dataset.timezone}. Ajuste a faixa abaixo do gráfico ou use Ctrl + rolagem para ampliar. Os indicadores e a exportação acompanham o intervalo aplicado.</p>
      {error && <p role="alert" className="notice error mt-4">{error}</p>}{(feedback || exporting) && <p role="status" className="mt-4 text-sm text-muted-foreground">{exporting ? 'Preparando gráfico em alta resolução…' : feedback}</p>}
      <dl className="mt-6 grid grid-cols-2 gap-y-5 border-y py-5 sm:grid-cols-3 lg:grid-cols-5">{[
        ['Medições no intervalo', stats ? number(stats.count) : '0'],
        ['Mínimo', stats ? `${number(stats.min)} ${dataset.unit}` : '—'],
        ['Máximo', stats ? `${number(stats.max)} ${dataset.unit}` : '—'],
        ['Primeira medição', stats ? formatTime(stats.start, dataset.timezone, 'dd/MM/yyyy HH:mm:ss.SSS') : '—'],
        ['Última medição', stats ? formatTime(stats.end, dataset.timezone, 'dd/MM/yyyy HH:mm:ss.SSS') : '—'],
      ].map(([label, value]) => <div key={label} className="pr-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1.5 text-sm font-semibold tabular-nums">{value}</dd></div>)}</dl>
    </div>
    {!stats && <p className="notice mx-5 mt-5 sm:mx-7" role="status">Não há medições neste intervalo. Amplie o período ou restaure a série completa.</p>}
    <TimeSeriesChart dataset={dataset} range={range} title={title} dark={dark} onRangeChange={updateRange} />
    <div className="border-t px-5 py-5 text-sm sm:px-7"><p className="leading-6 text-muted-foreground">{number(dataset.validRecords)} medições válidas na série · {number(dataset.invalidRecords)} registros inválidos excluídos · {number(dataset.duplicateTimestamps)} timestamps repetidos preservados. Os segmentos unem pontos reais; não foram inseridas medições intermediárias.</p><details className="mt-4"><summary className="font-medium">Consultar medições do intervalo</summary><p className="mt-3 text-muted-foreground">Primeiras 100 de {number(visible.length)} medições, em ordem cronológica.</p><div className="mt-3 max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="sticky top-0 bg-card px-3 py-2 font-medium">Data/hora · {dataset.timezone}</th><th className="sticky top-0 bg-card px-3 py-2 font-medium">Nível sonoro ({dataset.unit})</th></tr></thead><tbody>{visible.slice(0, 100).map((point, index) => <tr key={index} className="border-t tabular-nums"><td className="whitespace-nowrap px-3 py-2">{formatTime(point.timestamp, dataset.timezone)}</td><td className="px-3 py-2">{number(point.value)}</td></tr>)}</tbody></table></div></details></div>
  </section>
}
