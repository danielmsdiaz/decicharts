import { checkDocumentSize, duplicateRow, newBlock, rowFor, type ReportDocument, type ReportRow } from './model'

export interface ReportPage { id: string; start: number; end: number; rows: ReportRow[] }
export const FIRST_PAGE = 'first'
export function reportPages(doc: ReportDocument): ReportPage[] {
  const pages: ReportPage[] = [{ id: FIRST_PAGE, start: 0, end: doc.rows.length, rows: [] }]
  doc.rows.forEach((row, index) => {
    const blocks = row.columns.flat()
    if (blocks.length === 1 && blocks[0].kind === 'break') {
      pages.at(-1)!.end = index
      pages.push({ id: row.id, start: index + 1, end: doc.rows.length, rows: [] })
    } else pages.at(-1)!.rows.push(row)
  })
  return pages
}
function pageIn(doc: ReportDocument, id: string) {
  const page = reportPages(doc).find(page => page.id === id)
  if (!page) throw new Error('A página mudou. Selecione-a novamente.')
  return page
}
export function addReportPage(doc: ReportDocument, afterId: string, duplicate = false) {
  const page = pageIn(doc, afterId), separator = rowFor([[newBlock('break')]])
  const rows = [...doc.rows.slice(0, page.end), separator, ...(duplicate ? page.rows.map(duplicateRow) : []), ...doc.rows.slice(page.end)]
  const document = { ...doc, rows }; checkDocumentSize(document)
  return { document, pageId: separator.id }
}
export function deleteReportPage(doc: ReportDocument, id: string): ReportDocument {
  const pages = reportPages(doc), index = pages.findIndex(page => page.id === id)
  if (index < 0) throw new Error('A página mudou. Selecione-a novamente.')
  if (pages.length === 1) return { ...doc, rows: [] }
  const page = pages[index]
  return { ...doc, rows: index === 0 ? doc.rows.slice(pages[1].start) : [...doc.rows.slice(0, page.start - 1), ...doc.rows.slice(page.end)] }
}
