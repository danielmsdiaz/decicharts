import { useEffect, useRef } from 'react'
import type { EChartsType } from 'echarts/core'
import { init } from './engine'
import { chartOption } from './options'
import type { MeasurementDataset, TimeRange } from '@/features/measurements/types'
import { fullRange } from '@/features/measurements/range'
import { levelUnit } from '@/features/measurements/temporal'

export function TimeSeriesChart({ dataset, range, title, dark, onRangeChange }: { dataset: MeasurementDataset; range: TimeRange; title: string; dark: boolean; onRangeChange: (range: TimeRange) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const instance = useRef<EChartsType | null>(null)
  const change = useRef(onRangeChange)
  const activeRange = useRef(range)
  const available = fullRange(dataset.measurements)!
  useEffect(() => { change.current = onRangeChange; activeRange.current = range }, [onRangeChange, range])
  useEffect(() => {
    if (!container.current) return
    const chart = init(container.current, undefined, { renderer: 'canvas' })
    instance.current = chart
    chart.on('datazoom', () => {
      // Read calculated axis extents: percentage math is inaccurate for a single timestamp.
      const option = chart.getOption() as { dataZoom?: { startValue?: number; endValue?: number }[] }
      const zoom = option.dataZoom?.[0]
      if (typeof zoom?.startValue === 'number' && typeof zoom.endValue === 'number') {
        const next = { start: Math.max(available.start, Math.round(zoom.startValue)), end: Math.min(available.end, Math.round(zoom.endValue)) }
        if (next.start !== activeRange.current.start || next.end !== activeRange.current.end) change.current(next)
      }
    })
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container.current)
    return () => { observer.disconnect(); chart.dispose(); instance.current = null }
  }, [dataset, available.start, available.end])
  useEffect(() => { instance.current?.setOption(chartOption(dataset, activeRange.current, title, dark), { notMerge: true }) }, [dataset, title, dark])
  useEffect(() => { instance.current?.setOption({ dataZoom: [{ startValue: range.start, endValue: range.end }, { startValue: range.start, endValue: range.end }] }) }, [range])
  return <div ref={container} className="h-[420px] w-full sm:h-[480px]" role="img" aria-label={`${title}. Nível sonoro em ${levelUnit(dataset)}, ${dataset.timeBasis === 'elapsed' ? 'tempo decorrido em segundos' : `no fuso ${dataset.timezone}`}. Os indicadores e a tabela acessível abaixo descrevem o intervalo.`} />
}
