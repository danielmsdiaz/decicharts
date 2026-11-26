import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { LivePreview } from './LivePreview'
import type { ReportAsset, ReportDocument } from './model'

export function ReportPreviewDialog({ document: doc, assets, onClose }: { document: ReportDocument; assets: ReadonlyMap<string, ReportAsset>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), close = useRef<HTMLButtonElement>(null), titleId = useId()
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.current?.showModal(); close.current?.focus({ preventScroll: true })
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={dialog} className="report-preview-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <header className="report-preview-dialog-header">
      <div><div className="report-preview-dialog-title"><h2 id={titleId}>Prévia do documento</h2><HelpTooltip label="Sobre a prévia do documento">Folhas A4 para conferir o conteúdo. A distribuição de linhas e páginas pode variar no Word. Textos e tabelas são editáveis no arquivo exportado.</HelpTooltip></div><p>{doc.name}</p></div>
      <Button ref={close} variant="outline" onClick={onClose}><X aria-hidden="true" />Voltar à edição</Button>
    </header>
    <div className="report-preview-dialog-body"><div className="report-preview-pages"><LivePreview document={doc} assets={assets} /></div></div>
  </dialog>
}
