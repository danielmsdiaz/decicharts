import type { EChartsCoreOption } from 'echarts/core'
import { datasetTime, levelUnit, secondsText } from '@/features/measurements/temporal'
import type { MeasurementDataset, TimeRange } from '@/features/measurements/types'

export function chartOption(dataset: MeasurementDataset, range: TimeRange, title: string, dark = false, exporting = false): EChartsCoreOption {
  const relative = dataset.timeBasis === 'elapsed'
  const unit = levelUnit(dataset)
  const foreground = dark ? '#edf1f3' : '#20282e'
  const muted = dark ? '#a7b4bd' : '#5c6972'
  const grid = dark ? '#303b43' : '#e6ebee'
  const singleInstant = exporting && range.start === range.end
  const axisFontSize = exporting ? 18 : 14
  return {
    animation: false,
    backgroundColor: exporting ? '#ffffff' : 'transparent',
    textStyle: { fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', color: foreground, fontSize: exporting ? 18 : 14 },
    title: exporting ? { text: title, subtext: `${datasetTime(dataset, range.start)} — ${datasetTime(dataset, range.end)}${relative ? '' : ` · ${dataset.timezone}`} `, left: 35, top: 24, textStyle: { color: foreground, fontSize: 24, fontWeight: 600 }, subtextStyle: { color: muted, fontSize: 16 } } : undefined,
    grid: { top: exporting ? 140 : 50, left: exporting ? 105 : 85, right: 35, bottom: exporting ? 110 : 100 },
    tooltip: {
      trigger: 'axis', renderMode: 'richText', confine: true,
      formatter: (params: unknown) => {
        const items: unknown[] = Array.isArray(params) ? params : [params]
        return items.flatMap(item => {
          if (typeof item !== 'object' || item === null || !('value' in item) || !Array.isArray(item.value)) return []
          const [timestamp, value] = item.value as [number, number]
          return [`${datasetTime(dataset, timestamp)}\n${value.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} ${unit}${relative ? '' : `\n${dataset.timezone}`}`]
        }).join('\n')
      },
    },
    xAxis: {
      type: relative ? 'value' : 'time', name: relative ? 'Tempo decorrido (s)' : `Data / hora · ${dataset.timezone}`, nameLocation: 'middle', nameGap: 48,
      nameTextStyle: { color: muted, fontSize: axisFontSize }, axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: muted, fontSize: axisFontSize, hideOverlap: true, formatter: (value: number) => singleInstant && value !== range.start ? '' : relative ? secondsText(value) : datasetTime(dataset, value, singleInstant ? 'dd/MM/yyyy\nHH:mm:ss.SSS' : 'dd/MM\nHH:mm:ss') }, splitLine: { show: false },
      minInterval: 1,
      maxInterval: singleInstant ? 1 : undefined,
      // A time axis with identical min/max expands by days in ECharts. A 1 ms layout
      // margin gives a single labelled instant without adding measurement points.
      min: exporting ? range.start - (singleInstant ? 1 : 0) : dataset.measurements[0]?.timestamp,
      max: exporting ? range.end + (singleInstant ? 1 : 0) : dataset.measurements.at(-1)?.timestamp,
    },
    yAxis: {
      type: 'value', scale: true, name: `Nível sonoro (${unit})`, nameGap: 25,
      nameTextStyle: { color: muted, fontSize: axisFontSize }, axisLabel: { color: muted, fontSize: axisFontSize, formatter: (value: number) => value.toLocaleString('pt-BR') },
      splitLine: { lineStyle: { color: grid } },
    },
    dataZoom: exporting ? [] : [
      { type: 'inside', startValue: range.start, endValue: range.end, filterMode: 'filter', zoomOnMouseWheel: 'ctrl', moveOnMouseWheel: false },
      { type: 'slider', startValue: range.start, endValue: range.end, filterMode: 'filter', bottom: 12, height: 25, showDetail: false, showDataShadow: false, borderColor: grid, fillerColor: dark ? '#294a45' : '#cce6e0', handleStyle: { color: dark ? '#68d9c1' : '#0b7566' }, textStyle: { color: muted } },
    ],
    series: [{ name: `Nível sonoro (${unit})`, type: 'line', data: dataset.measurements.map(point => [point.timestamp, point.value]), smooth: false, showSymbol: dataset.measurements.length <= 1, symbolSize: 6, connectNulls: false, clip: true, lineStyle: { width: 1.5, color: dark ? '#68d9c1' : '#0b7566' }, itemStyle: { color: dark ? '#68d9c1' : '#0b7566' }, emphasis: { disabled: true } }],
  }
}
