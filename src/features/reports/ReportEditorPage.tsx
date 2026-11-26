import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRightLeft, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Eye, FilePlus2, Plus, Redo2, RefreshCw, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { Select } from '@/components/ui/select'
import { useConfirmation } from '@/components/ui/confirmation-context'
import { useWorkspace } from '@/features/analyses/workspace-context'
import { createFigureBlob } from '@/features/charts/export'
import { reportFormats } from '@/features/charts/report'
import { useReport } from './report-context'
import { assetFor, blockCount, duplicateRow, insertBlocks, newBlock, replaceBlock, rowFor, setColumns, type InsertTarget, type ReportBlock } from './model'
import { preparePhoto } from './photo'
import { ChartPicker, type PickedFigure } from './ChartPicker'
import { InsertMenu, type InsertKind } from './InsertMenu'
import { RichTextBlock } from './RichTextBlock'
import { ReportPreviewDialog } from './ReportPreviewDialog'
import { PageCanvas, type PageZoom } from './PageCanvas'
import { PageNavigator } from './PageNavigator'
import { addReportPage, deleteReportPage, FIRST_PAGE, reportPages } from './pages'
import './reports.css'

interface Menu { target: InsertTarget; anchor: HTMLElement }
export default function ReportEditorPage({ onBack }: { onBack: () => void }) {
  const report = useReport(), workspace = useWorkspace(), confirm = useConfirmation()
  const [menu, setMenu] = useState<Menu | null>(null), [picker, setPicker] = useState<InsertTarget | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [activePageId, setActivePageId] = useState(FIRST_PAGE), [zoom, setZoom] = useState<PageZoom>('fit')
  const [toolsOpen, setToolsOpen] = useState(() => window.matchMedia('(min-width: 901px)').matches)
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [status, setStatus] = useState('')
  const file = useRef<HTMLInputElement>(null), photoTarget = useRef<InsertTarget | null>(null)
  const mounted = useRef(true), operation = useRef(0)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)')
    const changed = () => setToolsOpen(media.matches)
    media.addEventListener('change', changed)
    return () => media.removeEventListener('change', changed)
  }, [])
  const closeMenu = useCallback(() => setMenu(null), [])
  function run(action: () => void) { try { action(); setError(''); setStatus('') } catch (issue) { setError(issue instanceof Error ? issue.message : 'Não foi possível alterar o documento.') } }
  function openMenu(target: InsertTarget, anchor: HTMLElement) { setMenu({ target, anchor }); setError('') }
  function selectPage(id: string) { setActivePageId(id); setSelected(null); setMenu(null); setStatus('') }
  function addPage(duplicate = false) {
    run(() => {
      const next = addReportPage(report.document, page.id, duplicate)
      report.change(() => next.document); selectPage(next.pageId)
    })
  }
  async function removePage() {
    if (page.rows.length && !await confirm({ title: 'Excluir esta página?', description: `O conteúdo da página ${pageIndex + 1} será removido. Você pode recuperá-lo com Desfazer.`, confirmLabel: 'Excluir página', tone: 'danger' })) return
    run(() => {
      const next = deleteReportPage(report.document, page.id)
      report.change(() => next)
      selectPage(reportPages(next)[Math.max(0, pageIndex - 1)].id)
    })
  }
  function insert(kind: InsertKind) {
    if (!menu) return
    const target = menu.target
    setMenu(null)
    if (kind === 'chart') { setPicker(target); return }
    if (kind === 'photo') { photoTarget.current = target; file.current?.click(); return }
    if (kind === 'columns') {
      run(() => report.change(doc => ({ ...doc, rows: [...doc.rows.slice(0, target.index), rowFor([[], []]), ...doc.rows.slice(target.index)] })))
      return
    }
    const block = newBlock(kind)
    run(() => {
      const next = insertBlocks(report.document, target, [block])
      report.change(() => next)
      if (kind === 'break') selectPage(next.rows[target.index].id)
      else setSelected(block.id)
    })
  }
  function insertFigures(values: PickedFigure[], paired: boolean) {
    if (!picker) throw new Error('Selecione novamente o local dos gráficos.')
    const blocks: ReportBlock[] = values.map(({ asset, source }) => ({ id: crypto.randomUUID(), kind: 'figure', assetId: asset.id, caption: '', alt: `Gráfico do ponto ${source.label}`, source }))
    report.addAssets(values.map(value => value.asset), doc => insertBlocks(doc, picker, blocks, paired))
    setSelected(blocks[0]?.id ?? null); setStatus(`${blocks.length} ${blocks.length === 1 ? 'gráfico inserido' : 'gráficos inseridos'}.`)
  }
  async function photo(selectedFile: File) {
    const target = photoTarget.current
    if (!target) return
    const token = ++operation.current
    setBusy('Preparando foto…'); setError('')
    try {
      const asset = await preparePhoto(selectedFile)
      if (!mounted.current || operation.current !== token) { URL.revokeObjectURL(asset.url); return }
      const block: ReportBlock = { id: crypto.randomUUID(), kind: 'figure', assetId: asset.id, caption: '', alt: selectedFile.name.replace(/\.[^.]+$/, '') }
      report.addAssets([asset], doc => insertBlocks(doc, target, [block])); setSelected(block.id); setStatus('Foto inserida.')
    } catch (issue) { if (mounted.current) setError(issue instanceof Error ? issue.message : 'Não foi possível inserir a foto.') }
    finally { if (mounted.current) setBusy(''); photoTarget.current = null }
  }
  async function updateFigure(block: Extract<ReportBlock, { kind: 'figure' }>) {
    if (!block.source) return
    const point = workspace.capturePoints([block.source.pointId]).find(point => point.importId === block.source!.importId)
    if (!point) { setError('A análise de origem não está aberta. Abra-a em Análise e volte ao documento para atualizar este gráfico. A figura inserida foi preservada.'); return }
    const token = ++operation.current
    setBusy('Atualizando gráfico…'); setError('')
    try {
      const blob = await createFigureBlob(point.dataset, point.view, 'png', 'portrait')
      if (!mounted.current || operation.current !== token) return
      const asset = assetFor(blob, reportFormats.portrait.width * 2, reportFormats.portrait.height * 2)
      report.addAssets([asset], doc => replaceBlock(doc, block.id, value => value.kind === 'figure' ? { ...value, assetId: asset.id, source: { ...block.source!, view: point.view, version: point.version } } : value))
      setStatus('Gráfico atualizado. A legenda e a posição foram mantidas.')
    } catch (issue) { if (mounted.current) setError(issue instanceof Error ? issue.message : 'Não foi possível atualizar o gráfico.') }
    finally { if (mounted.current) setBusy('') }
  }
  async function exportWord() {
    const snapshot = structuredClone(report.document), assets = new Map(report.assets)
    setBusy('Gerando Word…'); setError(''); setStatus('')
    try {
      const { createWordDocument, downloadWord } = await import('./word-export')
      const blob = await createWordDocument(snapshot, assets)
      if (mounted.current) { downloadWord(blob, snapshot.name); setStatus('Word exportado. Você pode editar os textos e as tabelas no Word.') }
    } catch (issue) { if (mounted.current) setError(issue instanceof Error ? issue.message : 'Não foi possível exportar. Tente novamente.') }
    finally { if (mounted.current) setBusy('') }
  }
  const doc = report.document
  const pages = reportPages(doc), pageIndex = Math.max(0, pages.findIndex(page => page.id === activePageId)), page = pages[pageIndex]
  return <main className="dashboard-shell report-shell" onKeyDownCapture={event => {
    if (previewOpen || picker || busy) return
    if ((event.ctrlKey || event.metaKey) && !event.altKey && ['z', 'y'].includes(event.key.toLowerCase())) {
      event.preventDefault()
      if (event.key.toLowerCase() === 'y' || event.shiftKey) report.redo(); else report.undo()
    }
  }}>
    <div className="report-page-heading"><div className="report-heading-context"><Button variant="ghost" disabled={!!busy} onClick={onBack}><ArrowLeft />Voltar à análise</Button><span>{workspace.name}</span></div><div className="report-local-status"><span>Nesta aba</span><HelpTooltip label="Sobre o documento nesta aba">O documento permanece aberto ao navegar pelo Decicharts. Exporte o Word antes de fechar ou recarregar esta aba para guardar seu conteúdo.</HelpTooltip></div></div>
    <input ref={file} type="file" accept="image/png,image/jpeg" className="sr-only" aria-label="Foto para o documento" onChange={event => { const selectedFile = event.target.files?.[0]; event.target.value = ''; if (selectedFile) void photo(selectedFile) }} />
    <div className="report-workspace"><section className="report-editor-stage" aria-label="Edição do documento">
      <div className="report-stage-heading"><div><h1>Editor de documento</h1><p role="status">Página {pageIndex + 1} de {pages.length}</p></div><div className="report-stage-navigation" aria-label="Navegar entre páginas"><Button variant="ghost" size="icon" aria-label="Página anterior" disabled={pageIndex === 0 || !!busy} onClick={() => selectPage(pages[pageIndex - 1].id)}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="Próxima página" disabled={pageIndex === pages.length - 1 || !!busy} onClick={() => selectPage(pages[pageIndex + 1].id)}><ChevronRight /></Button></div></div>
      <PageCanvas pageId={page.id} zoom={zoom}><article className="report-paper" aria-label={`Página ${pageIndex + 1} em edição`}>
      {!page.rows.length && <div className="report-blank"><h2>{pages.length === 1 ? 'Monte seu documento' : `Página ${pageIndex + 1}`}</h2><p>Comece com um título, texto, tabela, foto ou gráfico.</p><Button variant="outline" onClick={event => openMenu({ rowId: null, column: 0, index: page.start }, event.currentTarget)}><Plus />Adicionar conteúdo</Button></div>}
      {!!page.rows.length && <InsertPoint label="Inserir no início" disabled={!!busy} onClick={anchor => openMenu({ rowId: null, column: 0, index: page.start }, anchor)} />}
      {page.rows.map((row, localIndex) => {
        const rowIndex = page.start + localIndex
        return <div className="report-row-group" key={row.id}>
        <section className="report-row" aria-label={`Trecho ${localIndex + 1}`}>
          <div className="report-row-tools" aria-label={`Ações do trecho ${localIndex + 1}`}>
            <div className="report-column-choice" aria-label="Colunas"><button type="button" aria-pressed={row.columns.length === 1} disabled={!!busy} onClick={() => report.change(value => ({ ...value, rows: value.rows.map(item => item.id === row.id ? setColumns(item, 1) : item) }))}>1 coluna</button><button type="button" aria-pressed={row.columns.length === 2} disabled={!!busy || row.columns.flat().some(block => block.kind === 'break')} onClick={() => report.change(value => ({ ...value, rows: value.rows.map(item => item.id === row.id ? setColumns(item, 2) : item) }))}>2 colunas</button></div>
            <button type="button" aria-label="Mover trecho para cima" title="Mover trecho para cima" disabled={localIndex === 0 || !!busy} onClick={() => report.change(value => { const rows = [...value.rows]; [rows[rowIndex - 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex - 1]]; return { ...value, rows } })}><ArrowUp /></button>
            <button type="button" aria-label="Mover trecho para baixo" title="Mover trecho para baixo" disabled={localIndex === page.rows.length - 1 || !!busy} onClick={() => report.change(value => { const rows = [...value.rows]; [rows[rowIndex], rows[rowIndex + 1]] = [rows[rowIndex + 1], rows[rowIndex]]; return { ...value, rows } })}><ArrowDown /></button>
            <button type="button" aria-label="Duplicar trecho" title="Duplicar trecho" disabled={!!busy} onClick={() => run(() => report.change(value => {
              if (blockCount(value) + row.columns.flat().length > 500) throw new Error('O documento aceita até 500 elementos.')
              return { ...value, rows: [...value.rows.slice(0, rowIndex + 1), duplicateRow(row), ...value.rows.slice(rowIndex + 1)] }
            }))}><Copy /></button>
            <button type="button" aria-label="Excluir trecho" title="Excluir trecho" disabled={!!busy} onClick={() => { report.change(value => ({ ...value, rows: value.rows.filter(item => item.id !== row.id) })); setStatus('Trecho removido. Use Desfazer para recuperá-lo.') }}><Trash2 /></button>
          </div>
          <div className={`report-columns columns-${row.columns.length}`}>
            {row.columns.map((column, columnIndex) => <div className="report-column" key={columnIndex}>
              {row.columns.length === 2 && column.length > 0 && <InsertPoint label={`Inserir no início da coluna ${columnIndex + 1}`} disabled={!!busy} onClick={anchor => openMenu({ rowId: row.id, column: columnIndex, index: 0 }, anchor)} />}
              {column.map((block, blockIndex) => <div className={`report-block ${selected === block.id ? 'is-selected' : ''}`} key={block.id} data-block-id={block.id}>
                {block.kind === 'break' ? <div className="report-page-break">Quebra de página</div> : block.kind === 'figure' ? <figure className="report-figure" onFocus={() => setSelected(block.id)}>
                  <button className="report-figure-select" type="button" aria-label={`Selecionar ${block.alt || 'figura'}`} onClick={() => setSelected(block.id)}>{report.assets.get(block.assetId) ? <img src={report.assets.get(block.assetId)!.url} alt={block.alt} /> : <span>Figura indisponível</span>}</button>
                  <figcaption><textarea rows={1} maxLength={2000} placeholder="Adicionar legenda…" aria-label={`Legenda de ${block.source?.label ?? 'foto'}`} value={block.caption} onChange={event => report.change(value => replaceBlock(value, block.id, old => old.kind === 'figure' ? { ...old, caption: event.target.value } : old), `caption-${block.id}`)} /></figcaption>
                  {selected === block.id && <div className="report-figure-tools">
                    {block.source && <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => void updateFigure(block)}><RefreshCw />Atualizar gráfico</Button>}
                    <label>Descrição da imagem<input aria-label={`Descrição de ${block.source?.label ?? 'foto'}`} value={block.alt} maxLength={300} onChange={event => report.change(value => replaceBlock(value, block.id, old => old.kind === 'figure' ? { ...old, alt: event.target.value } : old), `alt-${block.id}`)} /></label>
                  </div>}
                </figure> : <RichTextBlock block={block} selected={selected === block.id} onSelect={() => setSelected(block.id)} onChange={content => report.change(value => replaceBlock(value, block.id, old => 'content' in old ? { ...old, content } : old), `text-${block.id}`)} />}
                {(row.columns.length === 2 || column.length > 1) && <div className="report-block-actions">
                  {column.length > 1 && ([-1, 1] as const).map(direction => <button type="button" key={direction} title={`Mover elemento para ${direction < 0 ? 'cima' : 'baixo'}`} aria-label={`Mover elemento para ${direction < 0 ? 'cima' : 'baixo'}`} disabled={!!busy || blockIndex + direction < 0 || blockIndex + direction >= column.length} onClick={() => report.change(value => ({ ...value, rows: value.rows.map(item => item.id !== row.id ? item : { ...item, columns: item.columns.map((list, index) => {
                    if (index !== columnIndex) return list
                    const next = [...list]; [next[blockIndex], next[blockIndex + direction]] = [next[blockIndex + direction], next[blockIndex]]; return next
                  }) }) }))}>{direction < 0 ? <ArrowUp /> : <ArrowDown />}</button>)}
                  {row.columns.length === 2 && <button type="button" title="Mover para outra coluna" aria-label="Mover para outra coluna" disabled={!!busy} onClick={() => report.change(value => ({ ...value, rows: value.rows.map(item => item.id !== row.id ? item : { ...item, columns: item.columns.map((list, index) => index === columnIndex ? list.filter(old => old.id !== block.id) : [...list, block]) }) }))}><ArrowRightLeft /></button>}
                  <button type="button" title="Excluir elemento" aria-label="Excluir elemento" disabled={!!busy} onClick={() => report.change(value => ({ ...value, rows: value.rows.map(item => item.id !== row.id ? item : { ...item, columns: item.columns.map(list => list.filter(old => old.id !== block.id)) }) }))}><Trash2 /></button>
                </div>}
                {(row.columns.length === 2 || column.length > 1) && <InsertPoint label={`Inserir após elemento ${blockIndex + 1} da coluna ${columnIndex + 1}`} disabled={!!busy} onClick={anchor => openMenu({ rowId: row.id, column: columnIndex, index: blockIndex + 1 }, anchor)} />}
              </div>)}
              {!column.length && <button type="button" className="report-empty-column" disabled={!!busy} onClick={event => openMenu({ rowId: row.id, column: columnIndex, index: 0 }, event.currentTarget)}><Plus />Adicionar conteúdo</button>}
            </div>)}
          </div>
        </section>
        <InsertPoint label={`Inserir após trecho ${localIndex + 1}`} disabled={!!busy} onClick={anchor => openMenu({ rowId: null, column: 0, index: rowIndex + 1 }, anchor)} />
      </div>})}
    </article></PageCanvas></section>
    <aside className="report-sidebar" aria-label="Ferramentas e páginas"><Button variant="outline" className="report-mobile-tools-toggle" aria-expanded={toolsOpen} onClick={() => setToolsOpen(value => !value)}>Ferramentas e páginas<ChevronDown /></Button><div className="report-sidebar-content" hidden={!toolsOpen}>
      <div className="report-sidebar-actions">
        <label className="report-name">Nome do documento<input value={doc.name} maxLength={100} onChange={event => report.change(value => ({ ...value, name: event.target.value }), 'name')} /></label>
        <div className="report-document-actions"><Button variant="ghost" size="icon" aria-label="Desfazer" title="Desfazer (Ctrl+Z)" disabled={!report.canUndo || !!busy} onClick={report.undo}><Undo2 /></Button><Button variant="ghost" size="icon" aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)" disabled={!report.canRedo || !!busy} onClick={report.redo}><Redo2 /></Button><Button variant="ghost" disabled={!!busy} onClick={async () => {
          if (doc.rows.length && !await confirm({ title: 'Iniciar outro documento?', description: 'Exporte o Word para guardar o conteúdo atual. O documento desta aba será descartado.', confirmLabel: 'Iniciar documento' })) return
          operation.current++; report.clear(workspace.importId, workspace.name); selectPage(FIRST_PAGE); setError(''); setStatus('')
        }}><FilePlus2 />Novo</Button></div>
        <Button variant="outline" disabled={!!busy} onClick={event => openMenu({ rowId: null, column: 0, index: page.end }, event.currentTarget)}><Plus />Inserir conteúdo</Button>
        <Button variant="outline" aria-haspopup="dialog" disabled={!!busy} onClick={() => setPreviewOpen(true)}><Eye />Verificar prévia</Button>
        <Button disabled={!doc.rows.length || !!busy || !doc.name.trim()} onClick={() => void exportWord()}><Download />{busy === 'Gerando Word…' ? busy : 'Exportar Word'}</Button>
        <label className="report-zoom-label">Zoom da página<Select aria-label="Zoom da página" value={zoom} onChange={event => setZoom(event.target.value as PageZoom)}><option value="fit">Ajustar à largura</option><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option></Select></label>
        {error && <p className="notice error" role="alert">{error}</p>}
        <div className={`report-feedback ${busy || status ? 'has-text' : ''}`} role="status" aria-live="polite">{busy || status}</div>
      </div>
      <PageNavigator pages={pages} activeId={page.id} assets={report.assets} busy={!!busy} onSelect={selectPage} onAdd={() => addPage()} onDuplicate={() => addPage(true)} onDelete={() => void removePage()} />
    </div></aside></div>
    {previewOpen && <ReportPreviewDialog document={doc} assets={report.assets} initialPageId={page.id} onClose={() => setPreviewOpen(false)} />}
    {menu && <InsertMenu anchor={menu.anchor} insideColumn={menu.target.rowId !== null} onInsert={insert} onClose={closeMenu} />}
    {picker && <ChartPicker allowPair={picker.rowId === null} onClose={() => setPicker(null)} onInsert={insertFigures} />}
  </main>
}

function InsertPoint({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: (anchor: HTMLElement) => void }) {
  return <div className="report-insert-point"><button type="button" aria-label={label} disabled={disabled} onClick={event => onClick(event.currentTarget)}><Plus aria-hidden="true" /><span>Inserir</span></button></div>
}
