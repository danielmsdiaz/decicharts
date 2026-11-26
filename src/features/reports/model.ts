import type { JSONContent } from '@tiptap/core'
import type { ChartView } from '../../../shared/persistence'

export type TextKind = 'title' | 'subtitle' | 'text'
export interface FigureSource { importId: string; pointId: string; label: string; version: number | null; view: ChartView }
export type ReportBlock =
  | { id: string; kind: TextKind | 'table'; content: JSONContent }
  | { id: string; kind: 'figure'; assetId: string; caption: string; alt: string; source?: FigureSource }
  | { id: string; kind: 'break' }
export interface ReportRow { id: string; columns: ReportBlock[][] }
export interface ReportDocument { schemaVersion: 1; analysisId?: string; name: string; rows: ReportRow[] }
export interface ReportAsset { id: string; blob: Blob; url: string; width: number; height: number }
export interface InsertTarget { rowId: string | null; column: number; index: number }
export const MAX_REPORT_ASSETS_BYTES = 20 * 1024 * 1024
export const MAX_REPORT_BLOCKS = 500
export const blankDocument = (): ReportDocument => ({ schemaVersion: 1, name: 'Medições de ruído', rows: [] })
const paragraph = (): JSONContent => ({ type: 'paragraph' })
export function newBlock(kind: TextKind | 'table' | 'break'): ReportBlock {
  const id = crypto.randomUUID()
  if (kind === 'break') return { id, kind }
  const content: JSONContent = kind === 'table' ? { type: 'table', content: Array.from({ length: 3 }, (_, row) => ({ type: 'tableRow', content: Array.from({ length: 2 }, () => ({ type: row === 0 ? 'tableHeader' : 'tableCell', content: [paragraph()] })) })) } : paragraph()
  return { id, kind, content: { type: 'doc', content: [content] } }
}
export const rowFor = (columns: ReportBlock[][]): ReportRow => ({ id: crypto.randomUUID(), columns })
export const blockCount = (doc: ReportDocument) => doc.rows.reduce((sum, row) => sum + row.columns.flat().length, 0)
export function checkDocumentSize(doc: ReportDocument) {
  if (doc.rows.length > MAX_REPORT_BLOCKS || blockCount(doc) > MAX_REPORT_BLOCKS) throw new Error('O documento aceita até 500 elementos ou trechos. Divida o conteúdo em outro documento.')
}
export function insertBlocks(doc: ReportDocument, target: InsertTarget, blocks: ReportBlock[], paired = false): ReportDocument {
  if (blockCount(doc) + blocks.length > MAX_REPORT_BLOCKS) throw new Error('O documento aceita até 500 elementos. Divida o conteúdo em outro documento.')
  if (target.rowId === null) {
    if (target.index < 0 || target.index > doc.rows.length) throw new Error('O local de inserção mudou. Selecione-o novamente.')
    const rows: ReportRow[] = []
    for (let i = 0; i < blocks.length; i += paired ? 2 : 1) rows.push(rowFor(paired ? [[blocks[i]], blocks[i + 1] ? [blocks[i + 1]] : []] : [[blocks[i]]]))
    return { ...doc, rows: [...doc.rows.slice(0, target.index), ...rows, ...doc.rows.slice(target.index)] }
  }
  const row = doc.rows.find(value => value.id === target.rowId), column = row?.columns[target.column]
  if (!column || target.index < 0 || target.index > column.length) throw new Error('O local de inserção mudou. Selecione-o novamente.')
  return { ...doc, rows: doc.rows.map(value => value !== row ? value : { ...value, columns: value.columns.map((list, index) => index !== target.column ? list : [...list.slice(0, target.index), ...blocks, ...list.slice(target.index)]) }) }
}
export function replaceBlock(doc: ReportDocument, id: string, update: (block: ReportBlock) => ReportBlock): ReportDocument {
  return { ...doc, rows: doc.rows.map(row => ({ ...row, columns: row.columns.map(column => column.map(block => block.id === id ? update(block) : block)) })) }
}
export function setColumns(row: ReportRow, count: 1 | 2): ReportRow {
  if (row.columns.length === count) return row
  if (count === 1) return { ...row, columns: [row.columns.flat()] }
  const list = row.columns[0], middle = Math.ceil(list.length / 2)
  return { ...row, columns: [list.slice(0, middle), list.slice(middle)] }
}
export function duplicateRow(row: ReportRow): ReportRow {
  return rowFor(row.columns.map(column => column.map(block => ({ ...structuredClone(block), id: crypto.randomUUID() }))))
}
export const documentAssets = (doc: ReportDocument) => new Set(doc.rows.flatMap(row => row.columns.flat().flatMap(block => block.kind === 'figure' ? [block.assetId] : [])))
export function assetFor(blob: Blob, width: number, height: number): ReportAsset {
  return { id: crypto.randomUUID(), blob, width, height, url: URL.createObjectURL(blob) }
}
