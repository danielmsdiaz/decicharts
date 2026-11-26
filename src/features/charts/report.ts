import type { ChartView, ReportInfo } from '../../../shared/persistence'
import type { MeasurementDataset } from '@/features/measurements/types'
import { datasetTime, levelUnit } from '@/features/measurements/temporal'
import { indicators, ESTIMATE_NOTE } from '@/features/measurements/indicators'
import { selectMeasurements } from '@/features/measurements/statistics'
import { chartOption, scaleLimitNote } from './options'
import { format, type EChartsCoreOption } from 'echarts/core'
import { figureColors, mixColor, readableText } from './colors'

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
  const colors = figureColors(info)
  const headerText = readableText(colors.headerColor)
  const plotText = readableText(colors.chartBackgroundColor)
  const customPlot = info.chartBackgroundColor !== undefined || info.lineColor !== undefined
  const title = view.title.trim() || 'Monitoramento do nível de ruído'
  const titleSize = 38, titleLineHeight = 46, titleTop = 26
  const titleLines = wrap(title, contentWidth - (info.logo ? 170 : 0), titleSize, 700)
  const headerHeight = Math.max(116, titleTop * 2 + titleLines.length * titleLineHeight)
  const fields = [
    ['Ponto', dataset.point?.id],
    ['Empreendimento', info.enterprise],
    ['Endereço', info.address],
    ['Coordenadas', info.east || info.north ? `${info.east ? `${info.east} mE` : 'Leste não informado'} / ${info.north ? `${info.north} mN` : 'Norte não informado'}${[info.datum, info.zone ? `zona ${info.zone}` : '', info.hemisphere].filter(Boolean).map(item => ` · ${item}`).join('')}` : ''],
    ['Início informado', info.startedAt ? `${info.startedAt.replace('T', ' ')} · ${dataset.timezone}` : ''],
    ['Período', `${datasetTime(dataset, view.range.start)} — ${datasetTime(dataset, view.range.end)}${dataset.timeBasis === 'elapsed' ? '' : ` · ${dataset.timezone}`} · ${selected.length.toLocaleString('pt-BR')} medições`],
  ].filter((field): field is [string, string] => !!field[1])
  const notes = [scaleLimitNote(dataset, stats), stats.leq === null ? `Leq estimado indisponível: ${stats.reason}` : ESTIMATE_NOTE,
    `${dataset.fileName} · ${dataset.sheetName} · ${dataset.invalidRecords} registros inválidos · ${dataset.duplicateTimestamps} tempos repetidos`].filter(Boolean)

  const labelWidth = 166, metaPadding = 22, rowGap = 12
  const valueWidth = contentWidth - 2 * metaPadding - labelWidth
  const noteSize = 16, noteLineHeight = 23
  const noteLines = notes.flatMap(value => wrap(value, contentWidth, noteSize))
  // Reserve 240px for the plot plus its frame, labels, spacing and abbreviation notice.
  const notesHeight = noteLines.length * noteLineHeight
  const fieldBudget = height - headerHeight - notesHeight - 652
  function measureFields(size: number) {
    const lineHeight = Math.round(size * 1.35)
    const rows = fields.map(([label, value]) => ({ label, lines: wrap(value, valueWidth, size, 600) }))
    return { size, lineHeight, rows, height: rows.reduce((total, row) => total + row.lines.length * lineHeight + rowGap, 0) - rowGap }
  }
  let copy = measureFields(26)
  while (copy.height > fieldBudget && copy.size > 24) copy = measureFields(copy.size - 1)
  let abbreviated = false
  // Spread the available lines across every field so long identification never hides later fields.
  const maxLines = Math.max(fields.length, Math.floor((fieldBudget - rowGap * (fields.length - 1)) / copy.lineHeight))
  const counts = copy.rows.map(() => 1)
  for (let remaining = maxLines - counts.length; remaining > 0;) {
    let allocated = false
    copy.rows.forEach((row, index) => {
      if (remaining > 0 && counts[index] < row.lines.length) { counts[index]++; remaining--; allocated = true }
    })
    if (!allocated) break
  }
  const rows = copy.rows.map((row, index) => {
    if (row.lines.length <= counts[index]) return row
    abbreviated = true
    const lines = row.lines.slice(0, counts[index])
    lines[lines.length - 1] = `${lines.at(-1)!.slice(0, -2)}…`
    return { ...row, lines }
  })
  const fieldsHeight = rows.reduce((total, row) => total + row.lines.length * copy.lineHeight + rowGap, 0) - rowGap

  const metaTop = headerHeight + 24
  const metaHeight = fieldsHeight + 2 * metaPadding
  const statsTop = metaTop + metaHeight + 20
  const graphFrameTop = statsTop + 124
  const footerTop = height - 24 - notesHeight
  const graphFrameBottom = footerTop - 16
  const rect = (x: number, y: number, w: number, h: number, fill: string, radius = 0, stroke?: string) => ({
    type: 'rect', z: -1, shape: { x, y, width: w, height: h, r: radius }, style: { fill, stroke },
  })
  const text = (value: string, x: number, y: number, fontSize: number, fill: string, fontWeight = 400, lineHeight = fontSize + 4) => ({
    type: 'text', left: x, top: y, style: { text: value, fontSize, fontFamily, fontWeight, lineHeight, fill },
  })
  const graphics: object[] = [
    rect(0, 0, width, headerHeight, colors.headerColor),
    rect(0, headerHeight - 4, width, 4, info.headerColor ? mixColor(colors.headerColor, headerText, 0.24) : '#369e89'),
    text(titleLines.join('\n'), margin, Math.max(titleTop, (headerHeight - titleLines.length * titleLineHeight) / 2), titleSize, headerText, 700, titleLineHeight),
    rect(margin, metaTop, contentWidth, metaHeight, '#f2f6f4', 12, border),
    rect(margin, graphFrameTop, contentWidth, graphFrameBottom - graphFrameTop, colors.chartBackgroundColor, 12, customPlot ? mixColor(colors.chartBackgroundColor, plotText, 0.18) : border),
    text(noteLines.join('\n'), margin, footerTop, noteSize, muted, 400, noteLineHeight),
  ]
  let rowTop = metaTop + metaPadding
  rows.forEach(({ label, lines }, index) => {
    graphics.push(text(label, margin + metaPadding, rowTop + 5, 18, muted, 500, 26))
    graphics.push(text(lines.join('\n'), margin + metaPadding + labelWidth, rowTop, copy.size, foreground, 600, copy.lineHeight))
    rowTop += lines.length * copy.lineHeight + rowGap
    if (index < rows.length - 1) graphics.push(rect(margin + metaPadding, rowTop - rowGap / 2, contentWidth - 2 * metaPadding, 1, border))
  })
  if (abbreviated) graphics.push(text('Identificação abreviada para caber na figura.', margin + 16, graphFrameTop + 12, 15, customPlot ? plotText : muted))
  const tileGap = 12, tileWidth = (contentWidth - 3 * tileGap) / 4
  indicatorItems(dataset, stats).forEach(([label, value], index) => {
    const left = margin + index * (tileWidth + tileGap)
    const valueSize = value === 'Indisponível' ? 25 : 34
    const fittedSize = Math.min(valueSize, Math.floor(valueSize * (tileWidth - 32) / textWidth(value, valueSize, 700)))
    graphics.push(rect(left, statsTop, tileWidth, 104, '#e9f5f1', 9, border))
    graphics.push(text(label, left + 16, statsTop + 16, 18, muted, 500))
    graphics.push(text(value, left + 16, statsTop + 46, Math.max(1, fittedSize), foreground, 700))
  })
  if (info.logo) {
    graphics.push(rect(width - margin - 146, 17, 146, 82, '#ffffff', 9))
    graphics.push({ type: 'image', right: margin + 5, top: 22, style: { image: logoImage ?? info.logo, width: 136, height: 72 } })
  }
  const option: EChartsCoreOption = {
    ...chartOption({ ...dataset, measurements: selected }, view.range, title, false, true, dataset, customPlot ? { background: colors.chartBackgroundColor, line: colors.lineColor } : undefined), title: undefined,
    graphic: graphics, grid: { top: graphFrameTop + (abbreviated ? 78 : 54), left: margin + 60, right: margin + 26, bottom: height - graphFrameBottom + 82 }, tooltip: { show: false },
  }
  return { option, width, height }
}
