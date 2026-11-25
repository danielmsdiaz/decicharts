import type { ChartView, ReportInfo } from '../../../shared/persistence'
import type { MeasurementDataset } from '@/features/measurements/types'
import { datasetTime, levelUnit } from '@/features/measurements/temporal'
import { indicators, ESTIMATE_NOTE } from '@/features/measurements/indicators'
import { selectMeasurements } from '@/features/measurements/statistics'
import { chartOption } from './options'
import type { EChartsCoreOption } from 'echarts/core'

export const reportNumber = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export function indicatorItems(dataset: MeasurementDataset, stats: NonNullable<ReturnType<typeof indicators>>) {
  const unit = levelUnit(dataset)
  return [
    ['Menor nível', `${reportNumber(stats.min)} ${unit}`],
    ['Média aritmética', `${reportNumber(stats.mean)} ${unit}`],
    ['Maior nível', `${reportNumber(stats.max)} ${unit}`],
    [dataset.mapping.weighting === 'A' ? 'LAeq estimado' : 'Leq estimado', stats.leq === null ? 'Indisponível' : `${reportNumber(stats.leq)} ${unit}`],
  ]
}
function wrap(value: string, columns: number): string[] {
  const lines: string[] = []
  for (const paragraph of value.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      if (line && line.length + word.length + 1 > columns) { lines.push(line); line = '' }
      for (let offset = 0; offset < word.length; offset += columns) {
        const part = word.slice(offset, offset + columns)
        if (offset) { lines.push(line); line = '' }
        line += `${line ? ' ' : ''}${part}`
      }
    }
    lines.push(line)
  }
  return lines
}

export function reportOption(dataset: MeasurementDataset, view: ChartView, logoImage?: HTMLImageElement) {
  const selected = selectMeasurements(dataset.measurements, view.range)
  const stats = indicators(dataset, selected)
  if (!stats) throw new Error('Não há medições neste intervalo para exportar.')
  const info: ReportInfo = view.report ?? { ...dataset.point }
  const title = view.title.trim() || 'Monitoramento do nível de ruído'
  const titleLines = wrap(title, info.logo ? 70 : 86)
  const fields = [
    dataset.point ? `Ponto: ${dataset.point.id}` : '',
    info.enterprise ? `Empreendimento: ${info.enterprise}` : '',
    info.address ? `Endereço: ${info.address}` : '',
    info.east || info.north ? `Coordenadas: ${info.east ? `${info.east} mE` : 'Leste não informado'} / ${info.north ? `${info.north} mN` : 'Norte não informado'}${[info.datum, info.zone ? `zona ${info.zone}` : '', info.hemisphere].filter(Boolean).map(item => ` · ${item}`).join('')}` : '',
    info.startedAt ? `Data / hora inicial informada: ${info.startedAt.replace('T', ' ')} · ${dataset.timezone}` : '',
    `Período: ${datasetTime(dataset, view.range.start)} — ${datasetTime(dataset, view.range.end)}${dataset.timeBasis === 'elapsed' ? '' : ` · ${dataset.timezone}`} · ${selected.length.toLocaleString('pt-BR')} medições`,
  ].filter(Boolean).flatMap(value => wrap(value, 126))
  const metaTop = Math.max(100, 44 + titleLines.length * 36)
  const statsTop = metaTop + fields.length * 28 + 28
  const graphTop = statsTop + 142
  const height = Math.max(1000, graphTop + 640)
  const foreground = '#20282e', muted = '#5c6972'
  const graphics: object[] = [
    { type: 'text', left: 48, top: 36, style: { text: titleLines.join('\n'), fontSize: 28, fontWeight: 600, lineHeight: 36, fill: foreground } },
    { type: 'text', left: 48, top: metaTop, style: { text: fields.join('\n'), fontSize: 18, lineHeight: 28, fill: muted } },
    { type: 'line', shape: { x1: 48, y1: statsTop - 12, x2: 1552, y2: statsTop - 12 }, style: { stroke: '#e0e5e8' } },
  ]
  indicatorItems(dataset, stats).forEach(([label, value], index) => {
    graphics.push({ type: 'text', left: 48 + index * 378, top: statsTop + 4, style: { text: label, fontSize: 18, fill: muted } })
    graphics.push({ type: 'text', left: 48 + index * 378, top: statsTop + 38, style: { text: value, fontSize: value === 'Indisponível' ? 26 : 32, fontWeight: 600, fill: foreground } })
  })
  const footnotes = [stats.leq === null ? `Leq estimado indisponível: ${stats.reason}` : ESTIMATE_NOTE,
    `${dataset.fileName} · ${dataset.sheetName} · ${dataset.invalidRecords} registros inválidos · ${dataset.duplicateTimestamps} tempos repetidos`]
    .flatMap(value => wrap(value, 145))
  graphics.push({ type: 'text', left: 48, top: height - 80, style: { text: footnotes.join('\n'), fontSize: 16, lineHeight: 22, fill: muted } })
  if (info.logo) graphics.push({ type: 'image', right: 48, top: 30, style: { image: logoImage ?? info.logo, width: 136, height: 72 } })
  const option: EChartsCoreOption = {
    ...chartOption({ ...dataset, measurements: selected }, view.range, title, false, true), title: undefined,
    graphic: graphics, grid: { top: graphTop, left: 105, right: 48, bottom: 155 }, tooltip: { show: false },
  }
  return { option, width: 1600, height }
}
