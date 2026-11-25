import { init } from './engine'
import type { ChartView, ReportInfo } from '../../../shared/persistence'
import type { MeasurementDataset, TimeRange } from '@/features/measurements/types'
import { reportOption } from './report'

export function reportSvg(dataset: MeasurementDataset, view: ChartView) {
  const { option, width, height } = reportOption(dataset, view)
  const chart = init(null, undefined, { renderer: 'svg', ssr: true, width, height })
  try { chart.setOption(option); return chart.renderToSVGString() }
  finally { chart.dispose() }
}

export async function exportChart(dataset: MeasurementDataset, range: TimeRange, title: string, format: 'png' | 'svg', report?: ReportInfo) {
  const view = { title, range, report }
  await document.fonts.ready
  let blob: Blob
  if (format === 'svg') blob = new Blob([reportSvg(dataset, view)], { type: 'image/svg+xml;charset=utf-8' })
  else {
    let logoImage: HTMLImageElement | undefined
    if (report?.logo) { logoImage = new Image(); logoImage.src = report.logo; await logoImage.decode() }
    const { option, width, height } = reportOption(dataset, view, logoImage)
    const container = document.createElement('div')
    container.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;`
    document.body.appendChild(container)
    const chart = init(container, undefined, { renderer: 'canvas', width, height })
    try {
      chart.setOption(option); chart.getZr().flush()
      const dataUrl = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' })
      blob = await (await fetch(dataUrl)).blob()
    } finally { chart.dispose(); container.remove() }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const name = [dataset.fileName.replace(/\.[^.]+$/, ''), dataset.point?.id].filter(Boolean).join('-')
  link.href = url; link.download = `decicharts-${name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100)}.${format}`
  document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
