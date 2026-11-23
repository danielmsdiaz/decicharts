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
