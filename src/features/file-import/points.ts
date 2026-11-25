import type { Cell, ColumnMapping, PointCandidate, PointInfo, SheetData } from '@/features/measurements/types'
import { normalizeSheet } from './normalize'
import { MAX_RECORDS } from './validation'

const fold = (value: Cell | undefined) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
const key = (value: string) => value.normalize('NFC').trim().toLocaleUpperCase('pt-BR')
const isTime = (value: Cell | undefined) => /^(tempo|time|segundos|seconds)\s*(\(\s*s\s*\)|\(segundos\)|\(seconds\)|\(sec\))?$/.test(fold(value))
const isLevel = (value: Cell | undefined) => /^(db(?:\([acz]\))?|nivel(?: sonoro)?(?: \(db(?:\([acz]\))?\))?|level|spl)$/.test(fold(value))

export function discoverPoints(sheet: SheetData): PointCandidate[] {
  const metadata = new Map<string, PointInfo>()
  for (const [r, row] of sheet.rows.slice(0, 100).entries()) {
    const idColumn = row.findIndex(cell => /^(id(?: do)? ponto|id do ponto|ponto|point id|id)$/.test(fold(cell)))
    const addressColumn = row.findIndex(cell => /endereco|address/.test(fold(cell)))
    if (idColumn < 0 || addressColumn < 0) continue
    const east = row.findIndex(cell => /^(leste|east|easting|e)(?:\s|$)/.test(fold(cell)))
    const north = row.findIndex(cell => /^(norte|north|northing|n)(?:\s|$)/.test(fold(cell)))
    for (const data of sheet.rows.slice(r + 1)) {
      const id = String(data[idColumn] ?? '').trim()
      if (!id) break
      if (metadata.has(key(id))) throw new Error(`ID repetido na tabela de localização: ${id}. Revise o arquivo.`)
      metadata.set(key(id), { id, ...(data[addressColumn] != null ? { address: String(data[addressColumn]).trim() } : {}), ...(east >= 0 && data[east] != null ? { east: String(data[east]) } : {}), ...(north >= 0 && data[north] != null ? { north: String(data[north]) } : {}) })
    }
  }
  const blocks: { r: number; c: number }[] = []
  for (const [r, row] of sheet.rows.slice(0, 100).entries()) for (let c = 0; c < row.length - 1; c++) {
    if (isTime(row[c]) && isLevel(row[c + 1])) blocks.push({ r, c })
  }
  if (!blocks.length) return []
  const top = sheet.rows.slice(0, Math.min(...blocks.map(block => block.r)))
    .flatMap(row => row.filter(cell => typeof cell === 'string' && cell.trim()).map(String))
    .filter(value => !/^(medicoes|measurements|utm|sirgas)/.test(fold(value)))
  const monitoringTitle = top.find(value => /monitoramento|monitoring/.test(fold(value)))
  const groupLabels = new Set(blocks.map(({ r, c }) => key(String(sheet.rows[r - 1]?.[c] ?? ''))))
  const enterprise = top.find(value => /^(empresa|empreendimento|cliente)\s*:/i.test(value))?.replace(/^[^:]+:\s*/, '')
    ?? (monitoringTitle ? top.find(value => value !== monitoringTitle && !metadata.has(key(value)) && !groupLabels.has(key(value)) && !/^(ponto|endereco|leste|norte|id|utm)/.test(fold(value))) : undefined)
  const result = blocks.map(({ r, c }): PointCandidate => {
    let id = ''
    for (let above = r - 1; above >= Math.max(0, r - 3) && !id; above--) {
      const merge = sheet.merges?.find(item => item.s.r === above && item.s.c <= c && item.e.c >= c + 1)
      const cell = sheet.rows[above]?.[merge?.s.c ?? c]
      const candidate = String(cell ?? '').trim()
      if (candidate && !/^(medicoes|measurements|tempo|time|monitoramento|utm)/.test(fold(candidate))) id = candidate
    }
    if (!id && blocks.length > 1) throw new Error('Há blocos de medições sem ID do ponto. Identifique os pontos nos cabeçalhos antes de importar.')
    id ||= 'Série 1'
    const samples = sheet.rows.slice(r + 1, r + 21)
    return { id, info: { ...(metadata.get(key(id)) ?? { id }), ...(monitoringTitle ? { monitoringTitle } : {}), ...(enterprise ? { enterprise } : {}) }, mapping: {
      headerRow: r, dateColumn: c, valueColumn: c + 1, timeColumn: null,
      timeBasis: 'elapsed', weighting: 'unknown', dateFormat: 'br', decimal: samples.some(row => String(row[c + 1] ?? '').includes(',')) ? ',' : '.',
      referenceDate: '', timeOnly: false, timezone: 'America/Recife', unit: 'dB',
    } }
  })
  const seen = new Set<string>()
  for (const point of result) {
    if (seen.has(key(point.id))) throw new Error(`Há dois blocos com o ID ${point.id}. Revise os cabeçalhos; os dados não serão misturados.`)
    seen.add(key(point.id))
  }
  return result
}

export function normalizePoint(fileName: string, sheet: SheetData, point: PointCandidate, mapping: ColumnMapping = point.mapping) {
  // Other points and the location table must not create invalid records here.
  const rows = sheet.rows.map((row, index) => index <= mapping.headerRow || [mapping.dateColumn, mapping.valueColumn].some(col => row[col] != null && String(row[col]).trim()) ? row : [])
  const dataset = normalizeSheet(fileName, { ...sheet, rows }, mapping)
  return { ...dataset, point: point.info }
}

export function normalizePoints(fileName: string, sheet: SheetData, defaults: { timezone: string; unit: string }) {
  const datasets = (sheet.points ?? discoverPoints(sheet)).map(point => normalizePoint(fileName, sheet, point, { ...point.mapping, timezone: defaults.timezone }))
  if (datasets.reduce((total, data) => total + data.validRecords, 0) > MAX_RECORDS) throw new Error('A aba excede 250 mil medições somando todos os pontos. Divida o arquivo.')
  return datasets
}
