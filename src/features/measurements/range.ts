import { DateTime } from 'luxon'
import type { Measurement, TimeRange } from './types'

export function fullRange(measurements: Measurement[]): TimeRange | null {
  return measurements.length ? { start: measurements[0].timestamp, end: measurements[measurements.length - 1].timestamp } : null
}
export function selectMeasurements(measurements: Measurement[], range: TimeRange) {
  return measurements.filter(point => point.timestamp >= range.start && point.timestamp <= range.end)
}
export function summarize(measurements: Measurement[]) {
  if (!measurements.length) return null
  let min = Infinity, max = -Infinity
  for (const point of measurements) { min = Math.min(min, point.value); max = Math.max(max, point.value) }
  return { count: measurements.length, min, max, start: measurements[0].timestamp, end: measurements[measurements.length - 1].timestamp }
}
export const formatTime = (timestamp: number, timezone: string, format = 'dd/MM/yyyy HH:mm:ss.SSS') => DateTime.fromMillis(timestamp, { zone: timezone }).toFormat(format)
export function parseFilter(value: string, timezone: string) {
  const date = DateTime.fromISO(value, { zone: timezone })
  if (!date.isValid || date.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS") !== (value.length === 16 ? value + ':00.000' : value.length === 19 ? value + '.000' : value) || date.getPossibleOffsets().length > 1) throw new Error('Informe data e hora válidas e sem ambiguidade no fuso da série.')
  return date.toMillis()
}
