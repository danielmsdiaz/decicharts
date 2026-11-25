import type { EChartsCoreOption } from 'echarts/core'
import { datasetTime, levelUnit, secondsText } from '@/features/measurements/temporal'
import type { MeasurementDataset, TimeRange } from '@/features/measurements/types'
import { chartDetails } from './details'

export function chartOption(dataset: MeasurementDataset, range: TimeRange, title: string, dark = false, exporting = false, sourceDataset = dataset): EChartsCoreOption {
  const relative = dataset.timeBasis === 'elapsed'
  const unit = levelUnit(dataset)
  const foreground = dark ? '#edf1f3' : '#20282e'
  const muted = dark ? '#a7b4bd' : '#5c6972'
  const grid = dark ? '#303b43' : '#e6ebee'
  const minorGrid = dark ? '#273239' : '#f0f3f5'
  const accent = dark ? '#68d9c1' : '#0b7566'
  const surface = dark ? '#1a2024' : '#ffffff'
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
      backgroundColor: surface, borderColor: grid, padding: [12, 16], textStyle: { color: foreground, fontSize: 13 },
      axisPointer: { type: 'cross', snap: true, lineStyle: { color: accent, type: 'dashed', opacity: 0.6 }, crossStyle: { color: accent, type: 'dashed', opacity: 0.6 },
        label: { backgroundColor: dark ? '#dce9e6' : '#263e3a', color: dark ? '#172923' : '#ffffff', padding: [5, 8],
          formatter: ({ axisDimension, value }: { axisDimension: string; value: string | number }) => axisDimension === 'x' ? datasetTime(dataset, Number(value)) : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}` } },
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
      axisLabel: { color: muted, fontSize: axisFontSize, hideOverlap: true, formatter: (value: number) => singleInstant && value !== range.start ? '' : relative ? secondsText(value) : datasetTime(dataset, value, singleInstant ? 'dd/MM/yyyy\nHH:mm:ss.SSS' : 'dd/MM\nHH:mm:ss') },
      axisTick: { show: true, lineStyle: { color: grid } },
      splitLine: { show: true, lineStyle: { color: grid, type: 'dashed' } },
      minorTick: { show: relative && !singleInstant, splitNumber: 5, lineStyle: { color: grid } },
      minorSplitLine: { show: relative && !singleInstant, lineStyle: { color: minorGrid } },
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
      splitNumber: 6, axisTick: { show: true, lineStyle: { color: grid } },
      minorTick: { show: true, splitNumber: 2, lineStyle: { color: grid } },
      minorSplitLine: { show: true, lineStyle: { color: minorGrid, type: 'dotted' } },
    },
    dataZoom: exporting ? [] : [
      { type: 'inside', startValue: range.start, endValue: range.end, filterMode: 'filter', zoomOnMouseWheel: 'ctrl', moveOnMouseWheel: false },
      { type: 'slider', startValue: range.start, endValue: range.end, filterMode: 'filter', bottom: 12, height: 28, showDetail: true, showDataShadow: true, borderColor: grid, fillerColor: dark ? '#294a45' : '#cce6e0', handleStyle: { color: accent }, textStyle: { color: muted },
        labelFormatter: (value: number) => datasetTime(dataset, value), dataBackground: { lineStyle: { color: accent, opacity: 0.4 }, areaStyle: { color: accent, opacity: 0.06 } } },
    ],
    series: [{ id: 'measurements', name: `Nível sonoro (${unit})`, type: 'line', data: dataset.measurements.map(point => [point.timestamp, point.value]), smooth: false, ...chartDetails(sourceDataset, range, dark, exporting), connectNulls: false, clip: true,
      lineStyle: { width: exporting ? 2 : 1.8, color: accent, cap: 'round', join: 'round' }, itemStyle: { color: surface, borderColor: accent, borderWidth: 1.5 },
      emphasis: { disabled: false, itemStyle: { color: accent, borderColor: surface, borderWidth: 2 } } }],
  }
}
