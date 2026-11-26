import { DateTime, IANAZone } from 'luxon'
import type { ChartView, DatasetMetadata, PointTuple, Preferences, ReportInfo } from '../shared/persistence'
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
  return value.toLowerCase()
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
  return { title: text(input.title, 100), range: { start, end }, ...(input.report === undefined ? {} : { report: reportInfo(input.report) }) }
}
function reportInfo(value: unknown): ReportInfo {
  const raw = object(value), result: ReportInfo = {}
  for (const key of ['enterprise', 'address', 'east', 'north', 'datum', 'zone', 'hemisphere', 'startedAt'] as const) {
    if (raw[key] !== undefined && raw[key] !== '') result[key] = text(raw[key], key === 'address' ? 500 : 200)
  }
  if (result.startedAt && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(result.startedAt) || !DateTime.fromISO(result.startedAt).isValid)) throw new HttpError(400, 'Data inicial do relatório inválida.')
  for (const key of ['headerColor', 'chartBackgroundColor', 'lineColor'] as const) {
    if (raw[key] === undefined) continue
    if (typeof raw[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(raw[key])) throw new HttpError(400, 'Escolha uma cor hexadecimal válida (#RRGGBB).')
    result[key] = raw[key].toLowerCase()
  }
  if (raw.logo) {
    const logo = text(raw.logo, 175000)
    if (!/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(logo) || Buffer.from(logo.split(',')[1], 'base64').byteLength > 131072) throw new HttpError(400, 'Use um logotipo PNG normalizado com até 128 KiB.')
    result.logo = logo
  }
  return result
}
export function analysisName(value: unknown) { return text(value, 100) }
export function importInput(value: unknown) {
  const raw = object(value)
  return { id: uuid(raw.id), name: analysisName(raw.name), fileName: text(raw.fileName, 255), sheetName: text(raw.sheetName, 255),
    pointCount: integer(raw.pointCount, 1, MAX_POINTS), recordCount: integer(raw.recordCount, 1, MAX_POINTS) }
}
export function saveInput(value: unknown) {
  const raw = object(value)
  return { id: uuid(raw.id), baseVersion: integer(raw.baseVersion, 0, 2_147_483_646), name: analysisName(raw.name) }
}
export function importPoint(value: unknown) {
  const raw = object(value)
  return { ordinal: integer(raw.ordinal, 0, MAX_POINTS - 1), chart: chartView(raw.chart), ...(raw.metadata === undefined ? {} : { metadata: metadata(raw.metadata) }) }
}
export function pageOffset(value: string | null) {
  return integer(Number(value || 0), 0, 2_147_483_647)
}
export function metadata(value: unknown): DatasetMetadata {
  const input = object(value), raw = object(input.mapping)
  const prefs = preferences(input)
  const validRecords = integer(input.validRecords, 1, MAX_POINTS)
  const invalidRecords = integer(input.invalidRecords, 0, MAX_POINTS)
  const totalRecords = integer(input.totalRecords, 1, MAX_POINTS)
  if (totalRecords !== validRecords + invalidRecords) throw new HttpError(400, 'As contagens de registros não correspondem.')
  if (!['br', 'iso', 'excel'].includes(String(raw.dateFormat)) || ![',', '.'].includes(String(raw.decimal)) || typeof raw.timeOnly !== 'boolean') throw new HttpError(400, 'Mapeamento de colunas inválido.')
  const mappingPrefs = preferences(raw)
  if (input.schemaVersion !== undefined && input.schemaVersion !== 2) throw new HttpError(400, 'Versão de análise não suportada.')
  if (input.schemaVersion !== 2 && (input.timeBasis !== undefined || input.point !== undefined || input.sourceKind !== undefined || raw.timeBasis !== undefined || raw.weighting !== undefined)) throw new HttpError(400, 'Os novos metadados exigem a versão 2 da análise.')
  if (input.timeBasis !== undefined && !['absolute', 'elapsed'].includes(String(input.timeBasis))) throw new HttpError(400, 'Tipo de tempo inválido.')
  if (raw.timeBasis !== undefined && !['absolute', 'elapsed'].includes(String(raw.timeBasis))) throw new HttpError(400, 'Tipo de tempo inválido.')
  if ((input.timeBasis ?? 'absolute') !== (raw.timeBasis ?? 'absolute')) throw new HttpError(400, 'Tipo de tempo não corresponde ao mapeamento.')
  if (raw.weighting !== undefined && !['unknown', 'A', 'C', 'Z'].includes(String(raw.weighting))) throw new HttpError(400, 'Ponderação inválida.')
  if (input.sourceKind !== undefined && input.sourceKind !== 'instantaneous') throw new HttpError(400, 'Origem de medição inválida.')
  if (prefs.timezone !== mappingPrefs.timezone || prefs.unit !== mappingPrefs.unit) throw new HttpError(400, 'Unidade e fuso não correspondem ao mapeamento.')
  const invalidPreview = Array.isArray(input.invalidPreview) ? input.invalidPreview.slice(0, 100).map(item => {
    const row = object(item)
    return { row: integer(row.row, 1, MAX_POINTS + 101), reason: text(row.reason, 500) }
  }) : []
  return {
    ...(input.schemaVersion === 2 ? { schemaVersion: 2 as const, timeBasis: (input.timeBasis ?? 'absolute') as 'absolute' | 'elapsed', sourceKind: 'instantaneous' as const } : {}),
    ...(input.point ? { point: pointInfo(input.point) } : {}),
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
      ...(raw.timeBasis ? { timeBasis: raw.timeBasis as 'absolute' | 'elapsed' } : {}),
      ...(raw.weighting ? { weighting: raw.weighting as 'unknown' | 'A' | 'C' | 'Z' } : {}),
    }, invalidPreview,
  }
}
function pointInfo(value: unknown) {
  const raw = object(value)
  const result: NonNullable<DatasetMetadata['point']> = { id: text(raw.id, 100) }
  for (const key of ['address', 'east', 'north', 'enterprise', 'monitoringTitle'] as const) if (raw[key]) result[key] = text(raw[key], key === 'address' ? 500 : 200)
  return result
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
