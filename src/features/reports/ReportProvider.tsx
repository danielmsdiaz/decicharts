import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { useConfirmation } from '@/components/ui/confirmation-context'
import { blankDocument, blockCount, checkDocumentSize, documentAssets, MAX_REPORT_ASSETS_BYTES, type ReportAsset, type ReportDocument } from './model'
import { ReportContext } from './report-context'

interface History { document: ReportDocument; past: ReportDocument[]; future: ReportDocument[]; assets: Map<string, ReportAsset>; group?: string; at: number }
export function ReportProvider({ children }: { children: ReactNode }) {
  const { registerLogoutGuard } = useAuth()
  const confirm = useConfirmation()
  const [history, setHistory] = useState<History>(() => ({ document: blankDocument(), past: [], future: [], assets: new Map(), at: 0 }))
  const [editorPageId, setEditorPageId] = useState('first')
  const current = useRef(history)
  function commit(next: History) {
    const retained = new Set([next.document, ...next.past, ...next.future].flatMap(doc => [...documentAssets(doc)]))
    const assets = new Map(next.assets)
    for (const [id, asset] of current.current.assets) if (!retained.has(id)) URL.revokeObjectURL(asset.url)
    for (const id of assets.keys()) if (!retained.has(id)) assets.delete(id)
    const state = { ...next, assets }
    current.current = state; setHistory(state)
  }
  function change(update: (doc: ReportDocument) => ReportDocument, group?: string, values: ReportAsset[] = []) {
    const before = current.current, next = update(before.document)
    checkDocumentSize(next)
    if (JSON.stringify(next) === JSON.stringify(before.document)) return
    const now = Date.now(), grouped = group && group === before.group && now - before.at < 800
    const assets = new Map(before.assets); values.forEach(value => assets.set(value.id, value))
    commit({ document: next, assets, past: grouped ? before.past : [...before.past, before.document].slice(-60), future: [], group, at: now })
  }
  function addAssets(values: ReportAsset[], update: (doc: ReportDocument) => ReportDocument) {
    try {
      const size = [...current.current.assets.values(), ...values].reduce((sum, value) => sum + value.blob.size, 0)
      if (size > MAX_REPORT_ASSETS_BYTES) throw new Error('As imagens e o histórico de edição atingiram 20 MiB. Exporte o Word antes de iniciar outro documento.')
      // Validate the insertion before retaining media; failures leave the document intact.
      const next = update(current.current.document)
      const linked = documentAssets(next)
      if (linked.size > 50) throw new Error('O documento aceita até 50 imagens diferentes. Divida o conteúdo em outro documento.')
      if (values.some(value => !linked.has(value.id))) throw new Error('O destino da figura mudou. Selecione novamente onde deseja inseri-la.')
      change(() => next, undefined, values)
    } catch (issue) { values.forEach(value => URL.revokeObjectURL(value.url)); throw issue }
  }
  function clear(analysisId?: string, name?: string) {
    setEditorPageId('first')
    commit({ document: { ...blankDocument(), analysisId, ...(name ? { name } : {}) }, past: [], future: [], assets: new Map(), at: 0 })
  }
  const dirty = blockCount(history.document) > 0
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => registerLogoutGuard?.(() => !blockCount(current.current.document) || confirm({ title: 'Sair com um documento aberto?', description: 'Exporte o Word antes de sair para guardar o conteúdo. O documento desta aba será descartado.', confirmLabel: 'Sair da conta' })), [registerLogoutGuard, confirm])
  useEffect(() => {
    const state = current
    return () => { state.current.assets.forEach(value => URL.revokeObjectURL(value.url)) }
  }, [])
  return <ReportContext.Provider value={{ editorPageId, setEditorPageId, document: history.document, assets: history.assets, change, addAssets, clear,
    canUndo: history.past.length > 0, canRedo: history.future.length > 0,
    undo: () => {
      const before = current.current, previous = before.past.at(-1)
      if (previous) commit({ document: previous, assets: before.assets, past: before.past.slice(0, -1), future: [before.document, ...before.future], at: 0 })
    },
    redo: () => {
      const before = current.current, next = before.future[0]
      if (next) commit({ document: next, assets: before.assets, past: [...before.past, before.document], future: before.future.slice(1), at: 0 })
    },
  }}>{children}</ReportContext.Provider>
}
