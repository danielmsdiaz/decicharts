import { init } from './engine'
import { chartOption } from './options'
import type { MeasurementDataset, TimeRange } from '@/features/measurements/types'
import { selectMeasurements } from '@/features/measurements/range'

export async function exportChart(dataset: MeasurementDataset, range: TimeRange, title: string, format: 'png' | 'svg') {
  const points = selectMeasurements(dataset.measurements, range)
  if (!points.length) throw new Error('Não há medições no intervalo selecionado para exportar.')
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-10000px;top:0;width:1600px;height:900px;'
  document.body.appendChild(container)
  const chart = init(container, undefined, { renderer: format === 'svg' ? 'svg' : 'canvas', width: 1600, height: 900 })
  try {
    const options = chartOption({ ...dataset, measurements: points }, range, title, false, true)
    chart.setOption(options, { notMerge: true })
    chart.getZr().flush()
    let blob: Blob
    if (format === 'svg') {
      const dataUrl = chart.getDataURL({ type: 'svg', backgroundColor: '#fff' })
      const comma = dataUrl.indexOf(',')
      const svg = dataUrl.slice(0, comma).includes(';base64') ? atob(dataUrl.slice(comma + 1)) : decodeURIComponent(dataUrl.slice(comma + 1))
      blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    } else {
      const dataUrl = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
      blob = await (await fetch(dataUrl)).blob()
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `decicharts-${dataset.fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80)}.${format}`
    document.body.appendChild(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  } finally { chart.dispose(); container.remove() }
}
