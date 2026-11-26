import { init } from './engine'
import type { ChartView } from '../../../shared/persistence'
import type { MeasurementDataset } from '@/features/measurements/types'
import { defaultReportFormat, reportOption, reportPixelRatio, type ReportFormat } from './report'

export function reportSvg(dataset: MeasurementDataset, view: ChartView, aspect: ReportFormat = defaultReportFormat) {
  const { option, width, height } = reportOption(dataset, view, aspect)
  const chart = init(null, undefined, { renderer: 'svg', ssr: true, width, height })
  try { chart.setOption(option); return chart.renderToSVGString() }
  finally { chart.dispose() }
}

export async function createFigureBlob(dataset: MeasurementDataset, view: ChartView, format: 'png' | 'svg', aspect: ReportFormat): Promise<Blob> {
  await document.fonts.ready
  if (format === 'svg') return new Blob([reportSvg(dataset, view, aspect)], { type: 'image/svg+xml;charset=utf-8' })

  let logoImage: HTMLImageElement | undefined
  const logo = view.report?.logo
  if (logo) { logoImage = new Image(); logoImage.src = logo; await logoImage.decode() }

  const { option, width, height } = reportOption(dataset, view, aspect, logoImage)
  const chart = init(document.createElement('div'), undefined, { renderer: 'canvas', width, height })
  try {
    chart.setOption(option)
    chart.getZr().flush()
    const canvas = chart.renderToCanvas({ pixelRatio: reportPixelRatio, backgroundColor: '#ffffff' })
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Não foi possível gerar o PNG.'))
      }, 'image/png')
    })
  } finally { chart.dispose() }
}

export function downloadFigure(dataset: MeasurementDataset, blob: Blob, format: 'png' | 'svg') {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const name = [dataset.fileName.replace(/\.[^.]+$/, ''), dataset.point?.id].filter(Boolean).join('-')
  link.href = url; link.download = `decicharts-${name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100)}.${format}`
  document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
