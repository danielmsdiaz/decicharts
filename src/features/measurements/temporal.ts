import { DateTime } from 'luxon'
import type { MeasurementDataset, TimeBasis } from './types'

export function elapsedMilliseconds(value: string | number) {
  const text = String(value).trim().replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new Error('Informe segundos positivos ou zero, como 1,5.')
  const seconds = Number(text), milliseconds = seconds * 1000
  if (!Number.isSafeInteger(Math.round(milliseconds)) || Math.abs(milliseconds - Math.round(milliseconds)) > 0.000001) throw new Error('O tempo deve ter precisão máxima de 1 milissegundo.')
  return Math.round(milliseconds)
}
export const secondsText = (value: number) => (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
export function formatCoordinate(value: number, basis: TimeBasis | undefined, timezone: string, format = 'dd/MM/yyyy HH:mm:ss.SSS') {
  return basis === 'elapsed' ? `${secondsText(value)} s` : DateTime.fromMillis(value, { zone: timezone }).toFormat(format)
}
export const datasetTime = (dataset: MeasurementDataset, value: number, format?: string) => formatCoordinate(value, dataset.timeBasis, dataset.timezone, format)
export function levelUnit(dataset: MeasurementDataset) {
  const weighting = dataset.mapping.weighting
  // A preference or arbitrary unit string is not evidence of weighting.
  if (weighting && weighting !== 'unknown') return `dB(${weighting})`
  return /^db(?:\([acz]\))?$/i.test(dataset.unit.trim()) ? 'dB' : dataset.unit
}
