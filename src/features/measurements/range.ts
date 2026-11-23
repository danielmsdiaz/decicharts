import { DateTime } from 'luxon'
export { fullRange, selectMeasurements, summarize } from './statistics'
export const formatTime = (timestamp: number, timezone: string, format = 'dd/MM/yyyy HH:mm:ss.SSS') => DateTime.fromMillis(timestamp, { zone: timezone }).toFormat(format)
export function parseFilter(value: string, timezone: string) {
  const date = DateTime.fromISO(value, { zone: timezone })
  if (!date.isValid || date.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS") !== (value.length === 16 ? value + ':00.000' : value.length === 19 ? value + '.000' : value) || date.getPossibleOffsets().length > 1) throw new Error('Informe data e hora válidas e sem ambiguidade no fuso da série.')
  return date.toMillis()
}
