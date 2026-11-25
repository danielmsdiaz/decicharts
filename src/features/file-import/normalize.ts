import { DateTime, IANAZone } from 'luxon'
import type { Cell, ColumnMapping, MeasurementDataset, SheetData } from '@/features/measurements/types'
import { isNonEmpty, MAX_RECORDS } from './validation'
import { elapsedMilliseconds } from '@/features/measurements/temporal'

const DAY_MS = 86_400_000

function wallTime(parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number; millisecond?: number }, zone: string) {
  const date = DateTime.fromObject(parts, { zone })
  if (!date.isValid || Object.entries(parts).some(([key, value]) => date.get(key as 'year') !== value)) throw new Error('Data/hora inválida ou inexistente no fuso selecionado.')
  if (date.getPossibleOffsets().length > 1) throw new Error('Horário ambíguo neste fuso. Informe um timestamp ISO com offset explícito.')
  return date.toMillis()
}

function excelParts(serial: number, date1904: boolean) {
  if (!Number.isFinite(serial) || serial < 0) throw new Error('Data serial Excel inválida.')
  const days = Math.floor(serial)
  if (!date1904 && days === 60) throw new Error('Serial Excel 60 representa uma data inexistente.')
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31)
  const ms = epoch + (days - (!date1904 && days > 60 ? 1 : 0)) * DAY_MS + Math.round((serial - days) * DAY_MS)
  const date = DateTime.fromMillis(ms, { zone: 'UTC' })
  if (!date.isValid || date.year > 9999) throw new Error('Data serial Excel fora do intervalo permitido.')
  return { year: date.year, month: date.month, day: date.day, hour: date.hour, minute: date.minute, second: date.second, millisecond: date.millisecond }
}

function timeParts(cell: Cell) {
  if (typeof cell === 'number') {
    if (cell < 0 || cell >= 1) throw new Error('Hora Excel deve ser uma fração entre 0 e 1.')
    const ms = Math.round(cell * DAY_MS)
    return { hour: Math.floor(ms / 3_600_000), minute: Math.floor(ms / 60_000) % 60, second: Math.floor(ms / 1000) % 60, millisecond: ms % 1000 }
  }
  const match = String(cell ?? '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3}))?)?$/)
  if (!match) throw new Error('Hora inválida. Use HH:mm:ss ou uma fração Excel.')
  return { hour: Number(match[1]), minute: Number(match[2]), second: Number(match[3] ?? 0), millisecond: Number((match[4] ?? '').padEnd(3, '0')) }
}

export function parseTimestamp(dateCell: Cell, timeCell: Cell, mapping: ColumnMapping, date1904: boolean) {
  if (mapping.timeBasis === 'elapsed') return elapsedMilliseconds(String(dateCell ?? ''))
  const text = String(dateCell ?? '').trim()
  if (!text) throw new Error('Data/hora vazia.')
  if (mapping.timeOnly) {
    const base = DateTime.fromFormat(mapping.referenceDate, 'yyyy-MM-dd', { zone: 'UTC' })
    if (!base.isValid) throw new Error('Informe uma data de referência válida.')
    return wallTime({ year: base.year, month: base.month, day: base.day, ...timeParts(dateCell) }, mapping.timezone)
  }
  const separateTime = mapping.timeColumn !== null
  // A numeric Excel cell is always a serial regardless of the text date setting.
  if (typeof dateCell === 'number' || mapping.dateFormat === 'excel') {
    if (!/^\d+(?:[.,]\d+)?$/.test(text)) throw new Error('Data serial Excel inválida.')
    const parts = excelParts(Number(text.replace(',', '.')), date1904)
    return wallTime({ ...parts, ...(separateTime ? timeParts(timeCell) : {}) }, mapping.timezone)
  }
  if (!separateTime && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const explicit = DateTime.fromISO(text, { setZone: true })
    if (!explicit.isValid) throw new Error('Timestamp ISO inválido.')
    return explicit.toMillis()
  }
  const match = mapping.dateFormat === 'br'
    ? text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}:\d{2}(?::\d{2}(?:[.,]\d{1,3})?)?))?$/)
    : text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}:\d{2}(?::\d{2}(?:[.,]\d{1,3})?)?))?$/)
  if (!match) throw new Error('Data incompatível com o formato selecionado.')
  const year = Number(mapping.dateFormat === 'br' ? match[3] : match[1])
  const day = Number(mapping.dateFormat === 'br' ? match[1] : match[3])
  return wallTime({ year, month: Number(match[2]), day, ...timeParts(separateTime ? timeCell : (match[4] ?? '00:00:00')) }, mapping.timezone)
}

export function parseValue(cell: Cell, decimal: ',' | '.') {
  if (typeof cell === 'number') {
    if (Number.isFinite(cell)) return cell
    throw new Error('Valor sonoro não finito.')
  }
  const text = String(cell ?? '').trim()
  const pattern = decimal === ',' ? /^[+-]?\d+(?:,\d+)?$/ : /^[+-]?\d+(?:\.\d+)?$/
  if (!pattern.test(text)) throw new Error('Valor sonoro inválido. Confira o separador decimal; não use separador de milhar.')
  const value = Number(text.replace(',', '.'))
  if (!Number.isFinite(value)) throw new Error('Valor sonoro não finito.')
  return value
}

export function normalizeSheet(fileName: string, sheet: SheetData, mapping: ColumnMapping): MeasurementDataset {
  if (!IANAZone.isValidZone(mapping.timezone) && mapping.timezone !== 'UTC') throw new Error('Fuso horário inválido. Use um identificador IANA, como America/Recife.')
  if (!Number.isInteger(mapping.headerRow) || mapping.headerRow < 0 || mapping.headerRow > 99 || mapping.headerRow >= sheet.rows.length) throw new Error('Escolha uma linha de cabeçalho existente, entre 1 e 100.')
  const selected = [mapping.dateColumn, mapping.valueColumn, ...(mapping.timeColumn === null || mapping.timeOnly ? [] : [mapping.timeColumn])]
  if (new Set(selected).size !== selected.length || selected.some(column => !Number.isInteger(column) || column < 0 || column >= (sheet.rows[mapping.headerRow]?.length ?? 0))) throw new Error('Selecione colunas existentes e diferentes para data, hora e nível sonoro.')
  if (!mapping.unit.trim() || mapping.unit.length > 30) throw new Error('Informe uma unidade de até 30 caracteres.')
  if (sheet.rows.length - mapping.headerRow - 1 > MAX_RECORDS && sheet.rows.slice(mapping.headerRow + 1).filter(isNonEmpty).length > MAX_RECORDS) throw new Error('A aba excede o limite de 250 mil registros não vazios.')
  const result: MeasurementDataset = { schemaVersion: 2, timeBasis: mapping.timeBasis ?? 'absolute', sourceKind: 'instantaneous', fileName, sheetName: sheet.name, measurements: [], totalRecords: 0, validRecords: 0, invalidRecords: 0, duplicateTimestamps: 0, unit: mapping.unit.trim(), timezone: mapping.timezone, mapping: { ...mapping }, invalidPreview: [], preview: [] }
  const seen = new Set<number>()
  for (let index = mapping.headerRow + 1; index < sheet.rows.length; index++) {
    const row = sheet.rows[index]
    if (!isNonEmpty(row)) continue
    result.totalRecords++
    if (result.totalRecords > MAX_RECORDS) throw new Error('A aba excede o limite de 250 mil registros não vazios.')
    try {
      const timestamp = parseTimestamp(row[mapping.dateColumn], mapping.timeColumn === null ? null : row[mapping.timeColumn], mapping, sheet.date1904)
      const value = parseValue(row[mapping.valueColumn], mapping.decimal)
      result.measurements.push({ timestamp, value })
      if (seen.has(timestamp)) result.duplicateTimestamps++
      seen.add(timestamp)
      if (result.preview.length < 10) result.preview.push({ row: index + 1, original: row, timestamp, value })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Registro inválido.'
      result.invalidRecords++
      if (result.invalidPreview.length < 100) result.invalidPreview.push({ row: index + 1, reason, original: row })
      if (result.preview.length < 10) result.preview.push({ row: index + 1, original: row, reason })
    }
  }
  result.measurements.sort((a, b) => a.timestamp - b.timestamp)
  result.validRecords = result.measurements.length
  return result
}

export function suggestMapping(sheet: SheetData): ColumnMapping {
  const fold = (cell: Cell) => String(cell ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const candidates = sheet.rows.slice(0, 100).map((row, index) => ({ index, score: row.reduce<number>((score, cell) => score + (/data|date|timestamp|hora|time|nivel|level|db|laeq|spl/.test(fold(cell)) ? 1 : 0), 0) }))
  const headerRow = candidates.sort((a, b) => b.score - a.score)[0]?.index ?? 0
  const headers = sheet.rows[headerRow]?.map(fold) ?? []
  const find = (pattern: RegExp) => { const matches = headers.flatMap((header, index) => pattern.test(header) ? [index] : []); return matches.length === 1 ? matches[0] : -1 }
  const dateColumn = find(/data|date|timestamp/)
  const time = find(/^(hora|time|horario)$/)
  const valueColumn = find(/nivel|level|db|laeq|spl/)
  const samples = sheet.rows.slice(headerRow + 1, headerRow + 21)
  const dateSample = samples.find(row => row[dateColumn] != null)?.[dateColumn]
  return { headerRow, dateColumn, timeColumn: time >= 0 && time !== dateColumn ? time : null, valueColumn, dateFormat: typeof dateSample === 'number' ? 'excel' : /^\d{4}-/.test(String(dateSample)) ? 'iso' : 'br', decimal: samples.some(row => String(row[valueColumn] ?? '').includes(',')) ? ',' : '.', referenceDate: '', timeOnly: false, timezone: 'America/Recife', unit: 'dB' }
}
