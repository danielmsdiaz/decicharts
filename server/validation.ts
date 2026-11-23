import { IANAZone } from 'luxon'
import type { ChartView, DatasetMetadata, PointTuple, Preferences } from '../shared/persistence'
import { CHUNK_SIZE, MAX_POINTS } from '../shared/persistence'
import { HttpError } from './errors'

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Dados enviados em formato inválido.')
  return value as Record<string, unknown>
}
function text(value: unknown, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(400, 'Texto vazio ou acima do limite permitido.')
  return value.trim()
}
function integer(value: unknown, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new HttpError(400, 'Contagem ou índice inválido.')
  return value
}
export function uuid(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new HttpError(400, 'Identificador de análise inválido.')
  return value
}
export function preferences(value: unknown): Preferences {
  const input = object(value)
  const timezone = text(input.timezone, 100)
  if (timezone !== 'UTC' && !IANAZone.isValidZone(timezone)) throw new HttpError(400, 'Escolha um fuso horário válido.')
  return { timezone, unit: text(input.unit, 30) }
}
export function chartView(value: unknown): ChartView {
  const input = object(value), range = object(input.range)
  const start = integer(range.start, -8_640_000_000_000_000, 8_640_000_000_000_000)
  const end = integer(range.end, start, 8_640_000_000_000_000)
  return { title: text(input.title, 100), range: { start, end } }
}
export function analysisName(value: unknown) { return text(value, 100) }
export function metadata(value: unknown): DatasetMetadata {
  const input = object(value), raw = object(input.mapping)
  const prefs = preferences(input)
  const validRecords = integer(input.validRecords, 1, MAX_POINTS)
  const invalidRecords = integer(input.invalidRecords, 0, MAX_POINTS)
  const totalRecords = integer(input.totalRecords, 1, MAX_POINTS)
  if (totalRecords !== validRecords + invalidRecords) throw new HttpError(400, 'As contagens de registros não correspondem.')
  if (!['br', 'iso', 'excel'].includes(String(raw.dateFormat)) || ![',', '.'].includes(String(raw.decimal)) || typeof raw.timeOnly !== 'boolean') throw new HttpError(400, 'Mapeamento de colunas inválido.')
  const mappingPrefs = preferences(raw)
  if (prefs.timezone !== mappingPrefs.timezone || prefs.unit !== mappingPrefs.unit) throw new HttpError(400, 'Unidade e fuso não correspondem ao mapeamento.')
  const invalidPreview = Array.isArray(input.invalidPreview) ? input.invalidPreview.slice(0, 100).map(item => {
    const row = object(item)
    return { row: integer(row.row, 1, MAX_POINTS + 101), reason: text(row.reason, 500) }
  }) : []
  return {
    fileName: text(input.fileName, 255), sheetName: text(input.sheetName, 255),
    totalRecords, validRecords, invalidRecords,
    duplicateTimestamps: integer(input.duplicateTimestamps, 0, validRecords - 1), ...prefs,
    mapping: {
      headerRow: integer(raw.headerRow, 0, 99), dateColumn: integer(raw.dateColumn, 0, 16383),
      valueColumn: integer(raw.valueColumn, 0, 16383),
      timeColumn: raw.timeColumn === null ? null : integer(raw.timeColumn, 0, 16383),
      dateFormat: raw.dateFormat as 'br' | 'iso' | 'excel', decimal: raw.decimal as ',' | '.',
      timeOnly: raw.timeOnly, referenceDate: typeof raw.referenceDate === 'string' ? raw.referenceDate.slice(0, 10) : '',
      ...mappingPrefs,
    }, invalidPreview,
  }
}
export function chunk(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > CHUNK_SIZE) throw new HttpError(400, 'Bloco de medições inválido.')
  let previous: number | null = null, duplicates = 0
  const points: PointTuple[] = value.map(item => {
    if (!Array.isArray(item) || item.length !== 2) throw new HttpError(400, 'Medição inválida.')
    const timestamp = integer(item[0], -8_640_000_000_000_000, 8_640_000_000_000_000)
    if (typeof item[1] !== 'number' || !Number.isFinite(item[1])) throw new HttpError(400, 'Nível sonoro inválido.')
    if (previous !== null && timestamp < previous) throw new HttpError(400, 'As medições devem estar em ordem cronológica.')
    if (timestamp === previous) duplicates++
    previous = timestamp
    return [timestamp, item[1]]
  })
  return { points, count: points.length, first: points[0][0], last: points.at(-1)![0], duplicates }
}
export function chunkIndex(value: string) {
  if (!/^\d+$/.test(value)) throw new HttpError(400, 'Índice de bloco inválido.')
  return integer(Number(value), 0, Math.ceil(MAX_POINTS / CHUNK_SIZE) - 1)
}
