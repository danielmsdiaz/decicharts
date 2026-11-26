import { Copy, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PreviewPageContent } from './LivePreview'
import type { ReportAsset } from './model'
import type { ReportPage } from './pages'

export function PageNavigator({ pages, activeId, assets, busy, onSelect, onAdd, onDuplicate, onDelete }: {
  pages: ReportPage[]; activeId: string; assets: ReadonlyMap<string, ReportAsset>; busy: boolean
  onSelect: (id: string) => void; onAdd: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const countLabel = (page: ReportPage) => {
    const count = page.rows.reduce((sum, row) => sum + row.columns.flat().length, 0)
    return count ? `${count} ${count === 1 ? 'elemento' : 'elementos'}` : 'Em branco'
  }
  return <section className="report-pages-section" aria-label="Páginas do documento">
    <div className="report-pages-heading"><h2>Páginas <span>{pages.length}</span></h2><Button variant="ghost" size="icon" aria-label="Adicionar página" title="Adicionar página" disabled={busy} onClick={onAdd}><Plus /></Button></div>
    <div className="report-pages-list">{pages.map((page, index) => <button type="button" className="report-page-choice" key={page.id} aria-label={`Página ${index + 1}`} aria-current={page.id === activeId ? 'page' : undefined} disabled={busy} onClick={() => onSelect(page.id)}>
      <span className="report-page-thumbnail" aria-hidden="true"><span className="report-thumbnail-canvas report-print-content"><PreviewPageContent rows={page.rows} assets={assets} /></span></span>
      <span className="report-page-choice-label"><strong>Página {index + 1}</strong><span>{countLabel(page)}</span>{page.id === activeId && <span className="report-current-page-label">Em edição</span>}</span>
    </button>)}</div>
    <div className="report-pages-footer"><Button variant="ghost" size="sm" disabled={busy} onClick={onDuplicate}><Copy />Duplicar página</Button><Button variant="ghost" size="icon" disabled={busy} onClick={onDelete} aria-label="Excluir página" title="Excluir página"><Trash2 /></Button></div>
  </section>
}
