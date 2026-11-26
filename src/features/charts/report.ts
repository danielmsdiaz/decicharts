import type { ChartView, ReportInfo } from '../../../shared/persistence'
import type { MeasurementDataset } from '@/features/measurements/types'
import { datasetTime, levelUnit } from '@/features/measurements/temporal'
import { indicators, ESTIMATE_NOTE } from '@/features/measurements/indicators'
import { selectMeasurements } from '@/features/measurements/statistics'
import { chartOption, scaleLimitNote } from './options'
import { format, type EChartsCoreOption } from 'echarts/core'

export const reportFormats = {
  portrait: { label: 'Retrato', ratio: '8:9', width: 960, height: 1080 },
  square: { label: 'Quadrada', ratio: '1:1', width: 1120, height: 1120 },
  landscape: { label: 'Paisagem', ratio: '8:5', width: 1600, height: 1000 },
} as const
export type ReportFormat = keyof typeof reportFormats
export const defaultReportFormat: ReportFormat = 'portrait'
export const reportPixelRatio = 2

const fontFamily = 'sans-serif'
const textWidth = (value: string, size: number, weight = 400) => format.getTextRect(value, `${weight} ${size}px ${fontFamily}`).width

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
function wrap(value: string, width: number, size: number, weight = 400): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of value.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (textWidth(next, size, weight) <= width) {
      line = next
      continue
    }
    if (line) lines.push(line)
    line = ''
    for (const character of word) {
      if (line && textWidth(line + character, size, weight) > width) {
        lines.push(line)
        line = ''
      }
      line += character
    }
  }
  lines.push(line)
  return lines
}

export function reportOption(dataset: MeasurementDataset, view: ChartView, aspect: ReportFormat = defaultReportFormat, logoImage?: HTMLImageElement) {
  const selected = selectMeasurements(dataset.measurements, view.range)
  const stats = indicators(dataset, selected)
  if (!stats) throw new Error('Não há medições neste intervalo para exportar.')
  const { width, height } = reportFormats[aspect]
  const margin = aspect === 'portrait' ? 36 : 44
  const contentWidth = width - 2 * margin
  const foreground = '#1e2d2b', muted = '#50615f', border = '#dce6e2'
  const info: ReportInfo = view.report ?? { ...dataset.point }
  const title = view.title.trim() || 'Monitoramento do nível de ruído'
  const titleSize = 36, titleLineHeight = 44, titleTop = 26
  const titleLines = wrap(title, contentWidth - (info.logo ? 170 : 0), titleSize, 700)
  const headerHeight = Math.max(116, titleTop * 2 + titleLines.length * titleLineHeight)
  const fields = [
    dataset.point ? `Ponto: ${dataset.point.id}` : '',
    info.enterprise ? `Empreendimento: ${info.enterprise}` : '',
    info.address ? `Endereço: ${info.address}` : '',
    info.east || info.north ? `Coordenadas: ${info.east ? `${info.east} mE` : 'Leste não informado'} / ${info.north ? `${info.north} mN` : 'Norte não informado'}${[info.datum, info.zone ? `zona ${info.zone}` : '', info.hemisphere].filter(Boolean).map(item => ` · ${item}`).join('')}` : '',
    info.startedAt ? `Data / hora inicial informada: ${info.startedAt.replace('T', ' ')} · ${dataset.timezone}` : '',
    `Período: ${datasetTime(dataset, view.range.start)} — ${datasetTime(dataset, view.range.end)}${dataset.timeBasis === 'elapsed' ? '' : ` · ${dataset.timezone}`} · ${selected.length.toLocaleString('pt-BR')} medições`,
  ].filter(Boolean)
  const notes = [scaleLimitNote(dataset, stats), stats.leq === null ? `Leq estimado indisponível: ${stats.reason}` : ESTIMATE_NOTE,
    `${dataset.fileName} · ${dataset.sheetName} · ${dataset.invalidRecords} registros inválidos · ${dataset.duplicateTimestamps} tempos repetidos`].filter(Boolean)

  function measureCopy(size: number) {
    const noteSize = Math.max(12, size - 4)
    const fieldLines = fields.flatMap(value => wrap(value, contentWidth, size))
    const noteLines = notes.flatMap(value => wrap(value, contentWidth, noteSize))
    const fieldLineHeight = Math.round(size * 1.4), noteLineHeight = noteSize + 6
    return { size, noteSize, fieldLines, noteLines, fieldLineHeight, noteLineHeight, fieldsHeight: fieldLines.length * fieldLineHeight, notesHeight: noteLines.length * noteLineHeight }
  }
  // Keep at least 264 layout pixels for the plot at every aspect ratio.
  const copyBudget = height - headerHeight - 590
  let copy = measureCopy(20)
  while (copy.fieldsHeight + copy.notesHeight > copyBudget && copy.size > 11) copy = measureCopy(copy.size - 1)
  const fieldLimit = Math.max(1, Math.floor((copyBudget - copy.notesHeight) / copy.fieldLineHeight))
  const fieldLines = copy.fieldLines.length <= fieldLimit ? copy.fieldLines : [...copy.fieldLines.slice(0, fieldLimit - 1), '…']

  const metaTop = headerHeight + 24
  const statsTop = metaTop + fieldLines.length * copy.fieldLineHeight + 20
  const graphFrameTop = statsTop + 110
  const footerTop = height - 24 - copy.notesHeight
  const graphFrameBottom = footerTop - 16
  const rect = (x: number, y: number, w: number, h: number, fill: string, radius = 0, stroke?: string) => ({
    type: 'rect', z: -1, shape: { x, y, width: w, height: h, r: radius }, style: { fill, stroke },
  })
  const text = (value: string, x: number, y: number, fontSize: number, fill: string, fontWeight = 400, lineHeight = fontSize + 4) => ({
    type: 'text', left: x, top: y, style: { text: value, fontSize, fontFamily, fontWeight, lineHeight, fill },
  })
  const graphics: object[] = [
    rect(0, 0, width, headerHeight, '#173c38'),
    rect(0, headerHeight - 4, width, 4, '#369e89'),
    text(titleLines.join('\n'), margin, Math.max(titleTop, (headerHeight - titleLines.length * titleLineHeight) / 2), titleSize, '#ffffff', 700, titleLineHeight),
    text(fieldLines.join('\n'), margin, metaTop, copy.size, foreground, 400, copy.fieldLineHeight),
    rect(margin, graphFrameTop, contentWidth, graphFrameBottom - graphFrameTop, '#f8fbfa', 12, border),
    text(copy.noteLines.join('\n'), margin, footerTop, copy.noteSize, muted, 400, copy.noteLineHeight),
  ]
  const tileGap = 12, tileWidth = (contentWidth - 3 * tileGap) / 4
  indicatorItems(dataset, stats).forEach(([label, value], index) => {
    const left = margin + index * (tileWidth + tileGap)
    const valueSize = value === 'Indisponível' ? 23 : 30
    const fittedSize = Math.min(valueSize, Math.floor(valueSize * (tileWidth - 32) / textWidth(value, valueSize, 700)))
    graphics.push(rect(left, statsTop, tileWidth, 90, '#edf6f2', 9, border))
    graphics.push(text(label, left + 16, statsTop + 14, 17, muted))
    graphics.push(text(value, left + 16, statsTop + 40, Math.max(1, fittedSize), foreground, 700))
  })
  if (info.logo) {
    graphics.push(rect(width - margin - 146, 17, 146, 82, '#ffffff', 9))
    graphics.push({ type: 'image', right: margin + 5, top: 22, style: { image: logoImage ?? info.logo, width: 136, height: 72 } })
  }
  const option: EChartsCoreOption = {
    ...chartOption({ ...dataset, measurements: selected }, view.range, title, false, true, dataset), title: undefined,
    graphic: graphics, grid: { top: graphFrameTop + 50, left: margin + 60, right: margin + 26, bottom: height - graphFrameBottom + 82 }, tooltip: { show: false },
  }
  return { option, width, height }
}
