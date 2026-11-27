import type { LineSeriesOption } from 'echarts/charts'
import type { MeasurementDataset, TimeRange } from '@/features/measurements/types'
import { indicators } from '@/features/measurements/indicators'
import { selectMeasurements } from '@/features/measurements/statistics'
import { levelUnit } from '@/features/measurements/temporal'
import { contrastRatio, readableText, type PlotColors } from './colors'

export function chartDetails(dataset: MeasurementDataset, range: TimeRange, dark: boolean, exporting: boolean, colors?: PlotColors): Pick<LineSeriesOption, 'showSymbol' | 'symbolSize' | 'markPoint' | 'markLine'> {
  const selected = selectMeasurements(dataset.measurements, range)
  const stats = indicators(dataset, selected)
  const accent = colors?.line ?? (dark ? '#68d9c1' : '#0b7566')
  const surface = colors?.background ?? (dark ? '#1a2024' : '#ffffff')
  const foreground = colors ? readableText(surface) : dark ? '#edf1f3' : '#20282e'
  const reference = dark ? '#e5bb72' : '#83571f'
  const referenceText = colors && contrastRatio(surface, reference) < 4.5 ? foreground : reference
  const unit = levelUnit(dataset)
  const number = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  function pointLabel(timestamp: number, position: 'top' | 'bottom'): { position: 'top' | 'bottom'; align: 'left' | 'right' | 'center'; offset: [number, number] } {
    const fraction = (timestamp - range.start) / (range.end - range.start || 1)
    return { position, align: fraction < 0.2 ? 'left' : fraction > 0.8 ? 'right' : 'center', offset: [fraction < 0.2 ? 5 : fraction > 0.8 ? -5 : 0, 0] }
  }
  const maximum = stats ? selected.find(point => point.value === stats.max) : undefined
  const minimum = stats ? selected.find(point => point.value === stats.min) : undefined
  const extrema = stats && stats.max !== stats.min ? [
    { name: 'Máx.', value: stats.max, coord: [maximum!.timestamp, stats.max], label: pointLabel(maximum!.timestamp, 'top') },
    { name: 'Mín.', value: stats.min, coord: [minimum!.timestamp, stats.min], label: pointLabel(minimum!.timestamp, 'bottom') },
  ] : []
  return {
    showSymbol: selected.length === 1 || (!exporting && selected.length <= 120),
    symbolSize: selected.length <= 1 ? 7 : exporting ? 4 : 3.5,
    markPoint: {
      silent: true, symbol: 'circle', symbolSize: 7, data: extrema,
      itemStyle: { color: accent, borderColor: surface, borderWidth: 1.5 },
      label: { show: true, distance: 9, color: foreground, backgroundColor: surface, padding: [3, 5], borderRadius: 3, fontSize: exporting ? 14 : 11,
        formatter: point => `${point.name} ${number(Number(point.value))} ${unit}` },
    },
    markLine: {
      silent: true, symbol: ['none', 'none'], animation: false,
      lineStyle: { color: colors ? referenceText : dark ? '#e5bb72' : '#926223', width: 1.25, type: 'dashed' },
      label: { show: true, position: 'insideEndTop', fontSize: exporting ? 14 : 11, color: referenceText, backgroundColor: surface, padding: [3, 5], borderRadius: 3,
        formatter: () => stats?.leq == null ? '' : `Leq est. ${number(stats.leq)} ${unit}` },
      data: stats?.leq != null && stats.max !== stats.min ? [{ yAxis: stats.leq }] : [],
    },
  }
}
