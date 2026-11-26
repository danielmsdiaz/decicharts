import { DOMSerializer, Slice, type Node as RichNode } from '@tiptap/pm/model'
import { Transform } from '@tiptap/pm/transform'
import type { JSONContent } from '@tiptap/core'
import { reportSchema } from './richtext'
import { deleteReportPage, FIRST_PAGE, reportPages, type ReportPage } from './pages'
import { MAX_REPORT_FIGURE_HEIGHT, checkDocumentSize, duplicateRow, insertBlocks, newBlock, rowFor, type InsertTarget, type ReportAsset, type ReportBlock, type ReportDocument, type ReportRow } from './model'

export const PAGE_WIDTH = 794, PAGE_HEIGHT = 1123, PAGE_MARGIN = 76
// Editing controls occupy their own space; reserve it in the shared layout.
const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_MARGIN * 2 - 54
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2 - 2
const ROW_SPACE = 96, BLOCK_SPACE = 96
export interface RichFragment { type: 'rich'; from: number; to: number; openStart: number; openEnd: number }
export interface FigureFragment { type: 'figure'; from: number; to: number; image: boolean; imageHeight: number }
export type BlockFragment = RichFragment | FigureFragment
export interface FlowPage extends ReportPage { manualId: string; fragments: Record<string, BlockFragment>; columnOffsets?: Record<string, number[]> }
interface Piece { block: ReportBlock; fragment: BlockFragment }

export function cutRich(content: JSONContent, from: number, to: number): JSONContent {
  const source = reportSchema.nodeFromJSON(content), value: JSONContent = source.cut(from, to).toJSON()
  const starts: number[] = []
  source.descendants((node, position) => {
    if (node.type.name !== 'orderedList' || position >= to || position + node.nodeSize <= from) return
    let offset = position + 1, skipped = 0
    node.forEach(item => { if (offset + item.nodeSize <= from) skipped++; offset += item.nodeSize })
    starts.push(Number(node.attrs.start ?? 1) + skipped)
  })
  function update(node: JSONContent) {
    if (node.type === 'orderedList') node.attrs = { ...node.attrs, start: starts.shift() ?? 1 }
    node.content?.forEach(update)
  }
  update(value); return value
}
export function replaceRichFragment(content: JSONContent, fragment: RichFragment, value: JSONContent) {
  const source = reportSchema.nodeFromJSON(content), updated = reportSchema.nodeFromJSON(value)
  return source.replace(fragment.from, fragment.to, new Slice(updated.content, fragment.openStart, fragment.openEnd)).toJSON() as JSONContent
}
function richPiece(block: Extract<ReportBlock, { content: JSONContent }>, source: RichNode, from: number, to: number): Piece {
  const slice = source.slice(from, to, true)
  return { block: { ...block, content: cutRich(source.toJSON(), from, to) }, fragment: { type: 'rich', from, to, openStart: slice.openStart, openEnd: slice.openEnd } }
}
function binaryFit(candidates: number[], fits: (end: number) => boolean) {
  let low = 0, high = candidates.length - 1, found = -1
  while (low <= high) {
    const middle = (low + high) >> 1
    if (fits(candidates[middle])) { found = candidates[middle]; low = middle + 1 } else high = middle - 1
  }
  return found
}

/** Derived only: never writes page breaks into the source while the user types. */
export function paginateReport(doc: ReportDocument, assets: ReadonlyMap<string, ReportAsset>, root: HTMLElement): FlowPage[] {
  const serializer = DOMSerializer.fromSchema(reportSchema)
  const cache = new Map<string, number>()
  function measure(piece: Piece, width: number) {
    const key = JSON.stringify([piece, width])
    const cached = cache.get(key); if (cached !== undefined) return cached
    const outer = document.createElement('div'); outer.className = `report-richtext report-${piece.block.kind}`; outer.style.width = `${width}px`
    const element = document.createElement('div'); element.className = 'tiptap'; outer.append(element)
    if ('content' in piece.block) element.append(serializer.serializeFragment(reportSchema.nodeFromJSON(piece.block.content).content))
    else if (piece.block.kind === 'figure' && piece.fragment.type === 'figure') {
      const figure = document.createElement('figure'); figure.className = 'report-figure'
      const { image, imageHeight } = piece.fragment
      if (image) { const box = document.createElement('div'); box.style.height = `${imageHeight}px`; figure.append(box) }
      const caption = document.createElement('div'); caption.className = 'report-caption-content'; caption.textContent = piece.block.caption || '\u00a0'; figure.append(caption)
      element.className = ''; element.append(figure)
    }
    root.replaceChildren(outer)
    const height = Math.ceil(outer.getBoundingClientRect().height)
    cache.set(key, height); return height
  }
  function split(piece: Piece, width: number, available: number): [Piece, Piece] | null {
    if ('content' in piece.block && piece.fragment.type === 'rich') {
      const original = doc.rows.flatMap(row => row.columns.flat()).find(block => block.id === piece.block.id)
      if (!original || !('content' in original)) return null
      const source = reportSchema.nodeFromJSON(original.content), { from, to } = piece.fragment
      const boundaries: number[] = [], characters: number[] = [], words: number[] = []
      source.descendants((node, position) => {
        if (node.isText) {
          for (let i = 1; i < node.nodeSize; i++) if (position + i > from && position + i < to) { characters.push(position + i); if (/\s/.test(node.text![i - 1])) words.push(position + i) }
        }
        else if (['paragraph', 'listItem', 'tableRow', 'bulletList', 'orderedList', 'table'].includes(node.type.name)) {
          const positionInSource = source.resolve(position)
          const nestedInTable = Array.from({ length: positionInSource.depth }, (_, i) => positionInSource.node(i + 1).type.name).includes('table')
          if (nestedInTable && node.type.name !== 'tableRow') return
          const end = position + node.nodeSize
          if (end > from && end < to) boundaries.push(end)
        }
      })
      const fits = (end: number) => measure(richPiece(original, source, from, end), width) <= available
      let end = binaryFit([...new Set(boundaries)].sort((a, b) => a - b), fits)
      if (!(original.kind === 'table' || source.firstChild?.type.name === 'table') || (end < 0 && available >= PAGE_CONTENT_HEIGHT - ROW_SPACE - BLOCK_SPACE - 52)) end = Math.max(end, binaryFit(characters, fits))
      const wordEnd = words.filter(position => position <= end).at(-1)
      if (wordEnd !== undefined) end = Math.max(boundaries.filter(position => position <= end).sort((a, b) => a - b).at(-1) ?? -1, wordEnd)
      if (end <= from) return null
      return [richPiece(original, source, from, end), richPiece(original, source, end, to)]
    }
    if (piece.block.kind === 'figure' && piece.fragment.type === 'figure') {
      const { from, to, image } = piece.fragment, block = piece.block
      let end = binaryFit(Array.from({ length: Math.max(0, to - from - 1) }, (_, i) => from + i + 1), end => measure({ block: { ...block, caption: block.caption.slice(0, end - from) }, fragment: piece.fragment }, width) <= available)
      if (end <= from) return null
      const prefixText = block.caption.slice(0, end - from), boundary = Math.max(prefixText.lastIndexOf('\n'), prefixText.lastIndexOf(' '))
      if (boundary >= 0) end = from + boundary + 1
      const prefix: Piece = { block: { ...block, caption: block.caption.slice(0, end - from) }, fragment: { ...piece.fragment, to: end } }
      const rest: Piece = { block: { ...block, caption: block.caption.slice(end - from) }, fragment: { ...piece.fragment, from: end, image: false, imageHeight: 0 } }
      if (!image) prefix.fragment = { ...piece.fragment, to: end }
      return [prefix, rest]
    }
    return null
  }
  const pages: FlowPage[] = []
  for (const manual of reportPages(doc)) {
    let page: FlowPage, used = 0, ordinal = 0
    function nextPage() {
      page = { ...manual, id: ordinal ? `${manual.id}:flow:${ordinal}` : manual.id, manualId: manual.id, rows: [], fragments: {}, columnOffsets: {} }
      ordinal++; pages.push(page); used = 0
    }
    nextPage()
    manual.rows.forEach((row, localIndex) => {
      const sourceIndex = manual.start + localIndex, width = row.columns.length === 2 ? (CONTENT_WIDTH - 20) / 2 : CONTENT_WIDTH
      let remaining: Piece[][] = row.columns.map(column => column.filter(block => block.kind !== 'break').map(block => {
        if ('content' in block) { const source = reportSchema.nodeFromJSON(block.content); return richPiece(block, source, 0, source.content.size) }
        if (block.kind === 'figure') {
          const asset = assets.get(block.assetId), height = asset ? Math.min(MAX_REPORT_FIGURE_HEIGHT, width * asset.height / asset.width) : 100
          return { block, fragment: { type: 'figure', from: 0, to: block.caption.length, image: !block.continuation, imageHeight: block.continuation ? 0 : height } } as Piece
        }
        throw new Error('Elemento de documento inválido.')
      }))
      if (!remaining.some(column => column.length) && used && used + ROW_SPACE + 140 > PAGE_CONTENT_HEIGHT) nextPage()
      let first = true
      while (first || remaining.some(column => column.length)) {
        first = false
        const available = PAGE_CONTENT_HEIGHT - used - ROW_SPACE
        const taken: Piece[][] = [], rest: Piece[][] = []; let rowHeight = 0
        for (const column of remaining) {
          const values: Piece[] = []; let height = row.columns.length === 2 && column.length ? 52 : 0, i = 0
          for (; i < column.length; i++) {
            const piece = column[i], controls = row.columns.length === 2 || column.length > 1 ? BLOCK_SPACE : 0
            const room = available - height - controls, blockHeight = measure(piece, width)
            if (blockHeight <= room) { values.push(piece); height += blockHeight + controls; continue }
            const keepFigure = piece.block.kind === 'figure' && used > 0 && blockHeight <= PAGE_CONTENT_HEIGHT - ROW_SPACE - controls - (row.columns.length === 2 ? 52 : 0)
            const parts = !keepFigure && room >= 50 ? split(piece, width, room) : null
            if (parts) { values.push(parts[0]); height += measure(parts[0], width) + controls; rest.push([parts[1], ...column.slice(i + 1)]); break }
            rest.push(column.slice(i)); break
          }
          if (i === column.length) rest.push([])
          taken.push(values); rowHeight = Math.max(rowHeight, height)
        }
        if (!taken.some(column => column.length) && remaining.some(column => column.length)) {
          if (used) { nextPage(); continue }
          throw new Error('Um elemento não cabe na folha A4. Use Desfazer e divida a linha da tabela ou o conteúdo deste elemento.')
        }
        if (!remaining.some(column => column.length)) rowHeight = Math.max(rowHeight, 140)
        const visible: ReportRow = { ...row, columns: taken.map(column => column.map(piece => piece.block)) }
        page!.columnOffsets![row.id] = remaining.map((column, ci) => column.length ? row.columns[ci].findIndex(block => block.id === column[0].block.id) : row.columns[ci].length)
        page!.rows.push(visible); page!.start = Math.min(page!.rows.length === 1 ? sourceIndex : page!.start, sourceIndex); page!.end = sourceIndex + 1
        taken.flat().forEach(piece => { page!.fragments[piece.block.id] = piece.fragment })
        used += ROW_SPACE + rowHeight; remaining = rest
        if (remaining.some(column => column.length)) nextPage()
      }
    })
  }
  root.replaceChildren()
  return pages
}

/** Page commands deliberately establish a manual boundary at the chosen location. */
export function pageSnapshot(doc: ReportDocument, pages: FlowPage[]) {
  const rows: ReportRow[] = [], ids: string[] = []
  pages.forEach((page, index) => {
    if (index) { const separator = rowFor([[newBlock('break')]]); rows.push(separator); ids.push(separator.id) } else ids.push(FIRST_PAGE)
    page.rows.forEach(row => rows.push(duplicateRow({ ...row, columns: row.columns.map(column => column.map(block => { const fragment = page.fragments[block.id]; return block.kind === 'figure' && fragment?.type === 'figure' && !fragment.image ? { ...block, continuation: true } : block })) })))
  })
  return { document: { ...doc, rows }, ids }
}

export function insertOnPage(doc: ReportDocument, page: FlowPage, target: InsertTarget, blocks: ReportBlock[], paired = false) {
  // Split only the affected row; pagination remains free to flow around an insertion.
  const rows = [...doc.rows]
  const sourceIndex = target.rowId ? rows.findIndex(row => row.id === target.rowId) : target.index === page.start ? page.start : target.index - 1
  const source = rows[sourceIndex], visible = page.rows.find(row => row.id === source?.id)
  if (!source || !visible) return insertBlocks(doc, target, blocks, paired)
  const parts: ReportRow[] = [rowFor(source.columns.map(() => [])), rowFor(source.columns.map(() => [])), rowFor(source.columns.map(() => []))]
  const visiblePositions: number[][] = source.columns.map(() => [])
  source.columns.forEach((column, ci) => column.forEach(block => {
    const displayedIndex = visible.columns[ci].findIndex(value => value.id === block.id), fragment = page.fragments[block.id]
    if (displayedIndex < 0 || !fragment) {
      const firstVisible = column.findIndex(value => visible.columns[ci].some(item => item.id === value.id))
      const offset = firstVisible < 0 ? page.columnOffsets?.[source.id]?.[ci] ?? column.length : firstVisible
      parts[column.indexOf(block) < offset ? 0 : 2].columns[ci].push(block); return
    }
    if ('content' in block && fragment.type === 'rich') {
      const size = reportSchema.nodeFromJSON(block.content).content.size
      if (fragment.from) parts[0].columns[ci].push({ ...block, id: crypto.randomUUID(), content: cutRich(block.content, 0, fragment.from) })
      visiblePositions[ci][displayedIndex] = parts[1].columns[ci].length
      parts[1].columns[ci].push({ ...block, content: cutRich(block.content, fragment.from, fragment.to) })
      if (fragment.to < size) parts[2].columns[ci].push({ ...block, id: crypto.randomUUID(), content: cutRich(block.content, fragment.to, size) })
    } else if (block.kind === 'figure' && fragment.type === 'figure') {
      if (fragment.from) parts[0].columns[ci].push({ ...block, id: crypto.randomUUID(), caption: block.caption.slice(0, fragment.from) })
      visiblePositions[ci][displayedIndex] = parts[1].columns[ci].length
      parts[1].columns[ci].push({ ...block, caption: block.caption.slice(fragment.from, fragment.to), continuation: !fragment.image || undefined })
      if (fragment.to < block.caption.length) parts[2].columns[ci].push({ ...block, id: crypto.randomUUID(), caption: block.caption.slice(fragment.to), continuation: true })
    } else { visiblePositions[ci][displayedIndex] = parts[1].columns[ci].length; parts[1].columns[ci].push(block) }
  }))
  if (target.rowId) {
    // A continuation can have an empty column whose earlier contents are on a
    // preceding sheet. Preserve that boundary when inserting into this column.
    parts[1].id = source.id
    rows.splice(sourceIndex, 1, ...parts.filter((part, index) => index === 1 || part.columns.some(column => column.length)))
    const index = visiblePositions[target.column][target.index] ?? parts[1].columns[target.column].length
    return insertBlocks({ ...doc, rows }, { ...target, index }, blocks, paired)
  }
  const nonempty = parts.filter(part => part.columns.some(column => column.length)), middle = nonempty.indexOf(parts[1])
  rows.splice(sourceIndex, 1, ...nonempty)
  const index = sourceIndex + middle + (target.index === page.start ? 0 : 1)
  return insertBlocks({ ...doc, rows }, { rowId: null, column: 0, index }, blocks, paired)
}


export function addFlowPage(doc: ReportDocument, page: FlowPage, duplicate = false) {
  const separator = newBlock('break')
  const next = insertOnPage(doc, page, { rowId: null, column: 0, index: page.end }, [separator])
  const index = next.rows.findIndex(row => row.columns.flat().some(block => block.id === separator.id))
  const rows = [...next.rows], copy = duplicate ? pageSnapshot(doc, [page]).document.rows : []
  const following = rows[index + 1], followingBreak = following?.columns.flat().some(block => block.kind === 'break')
  rows.splice(index + 1, 0, ...copy, ...(following && !followingBreak ? [rowFor([[newBlock('break')]])] : []))
  const document = { ...doc, rows }; checkDocumentSize(document)
  return { document, pageId: rows[index].id }
}

export function deleteFlowPage(doc: ReportDocument, page: FlowPage, pages: FlowPage[]): ReportDocument {
  if (pages.filter(value => value.manualId === page.manualId).length === 1) return deleteReportPage(doc, page.manualId)
  const rows = doc.rows.flatMap(row => {
    if (!page.rows.some(value => value.id === row.id)) return [row]
    const columns = row.columns.map(column => column.flatMap((block): ReportBlock[] => {
      const fragment = page.fragments[block.id]
      if (!fragment) return [block]
      if ('content' in block && fragment.type === 'rich') {
        const source = reportSchema.nodeFromJSON(block.content)
        if (fragment.from === 0 && fragment.to === source.content.size) return []
        return [{ ...block, content: new Transform(source).deleteRange(fragment.from, fragment.to).doc.toJSON() }]
      }
      if (block.kind === 'figure' && fragment.type === 'figure') {
        const caption = block.caption.slice(0, fragment.from) + block.caption.slice(fragment.to)
        if (fragment.image && !caption) return []
        return [{ ...block, caption, continuation: block.continuation || fragment.image }]
      }
      return []
    }))
    return columns.some(column => column.length) ? [{ ...row, columns }] : []
  })
  return { ...doc, rows }
}
