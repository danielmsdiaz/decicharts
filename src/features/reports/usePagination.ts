import { useEffect, useLayoutEffect, useState } from 'react'
import { reportPages } from './pages'
import { paginateReport, type FlowPage } from './pagination'
import type { ReportAsset, ReportDocument } from './model'

export function usePagination(doc: ReportDocument, assets: ReadonlyMap<string, ReportAsset>) {
  const [fontVersion, setFontVersion] = useState(0)
  const [layout, setLayout] = useState<{ pages: FlowPage[]; error: string }>({ pages: reportPages(doc).map(page => ({ ...page, manualId: page.id, fragments: {} })), error: '' })
  useEffect(() => {
    let active = true
    void document.fonts.ready.then(() => { if (active) setFontVersion(value => value + 1) })
    return () => { active = false }
  }, [])
  useLayoutEffect(() => {
    const root = document.createElement('div'); root.className = 'report-print-content report-pagination-measure'
    document.body.append(root)
    try { setLayout({ pages: paginateReport(doc, assets, root), error: '' }) }
    catch (issue) { setLayout(previous => ({ ...previous, error: issue instanceof Error ? issue.message : 'Não foi possível distribuir as páginas.' })) }
    finally { root.remove() }
  }, [doc, assets, fontVersion])
  return layout
}
