import { useEffect, useId, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { LivePreview } from './LivePreview'
import type { ReportAsset, ReportDocument } from './model'
import { FIRST_PAGE, reportPages } from './pages'

function scrollPreviewPage(viewport: HTMLDivElement | null, index: number) {
  const target = viewport?.querySelectorAll<HTMLElement>('[data-report-preview-page]')[index]
  if (!viewport || !target) return
  viewport.scrollTo({ top: viewport.scrollTop + target.getBoundingClientRect().top - viewport.getBoundingClientRect().top - parseFloat(getComputedStyle(viewport).paddingTop) })
}

export function ReportPreviewDialog({ document: doc, assets, initialPageId = FIRST_PAGE, onClose }: { document: ReportDocument; assets: ReadonlyMap<string, ReportAsset>; initialPageId?: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), close = useRef<HTMLButtonElement>(null), titleId = useId()
  const body = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState(initialPageId)
  const pages = reportPages(doc), activeIndex = Math.max(0, pages.findIndex(page => page.id === activeId))
  function trackPage() {
    const viewport = body.current
    if (!viewport) return
    const threshold = viewport.getBoundingClientRect().top + viewport.clientHeight * .35
    const elements = Array.from(viewport.querySelectorAll<HTMLElement>('[data-report-preview-page]'))
    const index = elements.reduce((current, element, index) => element.getBoundingClientRect().top <= threshold ? index : current, 0)
    setActiveId(pages[index].id)
  }
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.current?.showModal(); close.current?.focus({ preventScroll: true })
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
      const elements = Array.from(body.current?.querySelectorAll<HTMLElement>('[data-report-preview-page]') ?? [])
      scrollPreviewPage(body.current, Math.max(0, elements.findIndex(element => element.dataset.reportPreviewPage === initialPageId)))
    }) })
    return () => { cancelAnimationFrame(frame); if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [initialPageId])
  return <dialog ref={dialog} className="report-preview-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <header className="report-preview-dialog-header">
      <div><div className="report-preview-dialog-title"><h2 id={titleId}>Prévia do documento</h2><HelpTooltip label="Sobre a prévia do documento">Folhas A4 para conferir o conteúdo. A distribuição de linhas e páginas pode variar no Word. Textos e tabelas são editáveis no arquivo exportado.</HelpTooltip></div><p>{doc.name}</p></div>
      <Button ref={close} variant="outline" onClick={onClose}><X aria-hidden="true" />Voltar à edição</Button>
    </header>
    <div className="report-preview-pagination" aria-label="Navegar na prévia"><Button variant="ghost" size="icon" aria-label="Página anterior na prévia" disabled={activeIndex === 0} onClick={() => scrollPreviewPage(body.current, activeIndex - 1)}><ChevronLeft /></Button><span aria-live="polite" aria-atomic="true">Página {activeIndex + 1} de {pages.length}</span><Button variant="ghost" size="icon" aria-label="Próxima página na prévia" disabled={activeIndex === pages.length - 1} onClick={() => scrollPreviewPage(body.current, activeIndex + 1)}><ChevronRight /></Button></div>
    <div ref={body} className="report-preview-dialog-body" tabIndex={0} role="region" aria-label="Páginas da prévia" onScroll={trackPage}>
      <div className="report-preview-pages">{pages.map((page, index) => <section key={page.id} data-report-preview-page={page.id} aria-label={`Prévia da página ${index + 1}`}><LivePreview document={{ ...doc, rows: page.rows }} assets={assets} singlePage pageNumber={index + 1} /></section>)}</div>
    </div>
  </dialog>
}
