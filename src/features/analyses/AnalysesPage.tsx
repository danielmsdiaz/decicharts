import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { FolderOpen, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { api } from '@/lib/api'
import { formatCoordinate } from '@/features/measurements/temporal'
import type { AnalysisPage, AnalysisSummary } from '../../../shared/persistence'
import { loadAnalysis } from './service'
import { useWorkspace } from './workspace-context'
import { useConfirmation } from '@/components/ui/confirmation-context'

export default function AnalysesPage() {
  const { user } = useAuth()
  const workspace = useWorkspace()
  const confirm = useConfirmation()
  const navigate = useNavigate()
  const [items, setItems] = useState<AnalysisSummary[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [retry, setRetry] = useState(0)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => {
    if (!user) return
    const operation = new AbortController()
    controller.current = operation
    api<AnalysisPage>(user, 'analyses', { signal: operation.signal }).then(result => { setItems(result.analyses); setHasMore(result.hasMore); setError('') })
      .catch(issue => { if (!operation.signal.aborted) setError(issue instanceof Error ? issue.message : 'Não foi possível carregar suas análises.') })
      .finally(() => { if (!operation.signal.aborted) setLoading(false) })
    return () => { operation.abort(); controller.current?.abort() }
  }, [user, retry])

  async function more() {
    if (!user || busy) return
    setBusy('more'); setError('')
    try { const result = await api<AnalysisPage>(user, `analyses?offset=${items.length}`, { signal: controller.current?.signal }); setItems(current => [...current, ...result.analyses]); setHasMore(result.hasMore) }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'Não foi possível carregar a próxima página.') }
    finally { setBusy(null) }
  }
  async function open(item: AnalysisSummary) {
    if (!user || busy) return
    if (workspace.anyDirty && !await confirm({ title: 'Abrir esta análise?', description: 'Os pontos e alterações não salvos nesta sessão serão substituídos.', confirmLabel: 'Abrir análise' })) return
    setBusy(item.id); setError('')
    const operation = new AbortController()
    controller.current = operation
    try {
      const result = await loadAnalysis(user, item.id, operation.signal)
      operation.signal.throwIfAborted()
      workspace.accept(result.dataset, result.stored)
      navigate('/')
    } catch (issue) { if (!operation.signal.aborted) setError(issue instanceof Error ? issue.message : 'Não foi possível abrir a análise.') }
    finally { if (!operation.signal.aborted) setBusy(null) }
  }
  async function remove(item: AnalysisSummary) {
    if (!user || busy || !await confirm({ title: 'Excluir análise?', description: `“${item.name}” e suas medições salvas serão excluídas definitivamente.`, confirmLabel: 'Excluir análise', tone: 'danger' })) return
    setBusy(item.id); setError(''); setFeedback('')
    try {
      await api(user, `analyses/${item.id}`, { method: 'DELETE', signal: controller.current?.signal })
      workspace.detach(item.id)
      setItems(current => current.filter(value => value.id !== item.id))
      setFeedback('Análise excluída da sua conta.')
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'Não foi possível excluir a análise.') }
    finally { setBusy(null) }
  }
  async function startNew() {
    if (workspace.anyDirty && !await confirm({ title: 'Começar outra análise?', description: 'Os pontos e alterações não salvos serão descartados.', confirmLabel: 'Nova análise' })) return
    workspace.clear()
    navigate('/')
  }
  return <main className="dashboard-shell"><div className="dashboard-heading"><div><h1 className="text-3xl font-semibold tracking-tight">Minhas análises</h1></div><Button variant="outline" onClick={startNew}>Nova análise</Button></div>
    {error && <div className="notice error" role="alert"><p>{error}</p><Button className="mt-3" variant="outline" onClick={() => setRetry(value => value + 1)}><RefreshCw />Tentar novamente</Button></div>}
    {feedback && <p role="status" className="text-sm text-primary">{feedback}</p>}
    {loading ? <p className="panel p-8 text-sm" role="status">Carregando suas análises…</p> : !items.length && !error ? <section className="empty-history"><FolderOpen aria-hidden="true" /><h2 className="text-lg font-semibold">Nenhuma análise salva</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">As análises que você salvar aparecerão aqui.</p><Button asChild className="mt-6"><Link to="/">Importar medições</Link></Button></section> : <section className="panel overflow-hidden" aria-label="Análises salvas"><ul>{items.map(item => <li className="analysis-row" key={item.id}><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{item.name}</h2><p className="mt-1 break-all text-sm text-muted-foreground">{item.pointId ? `${item.pointId} · ` : ''}{item.fileName} · {item.count.toLocaleString('pt-BR')} medições · {item.unit}</p><p className="mt-2 text-sm text-muted-foreground tabular-nums">{formatCoordinate(item.start, item.timeBasis, item.timezone, 'dd/MM/yyyy HH:mm:ss')} — {formatCoordinate(item.end, item.timeBasis, item.timezone, 'dd/MM/yyyy HH:mm:ss')}</p></div><div className="flex gap-2"><Button variant="outline" disabled={Boolean(busy)} onClick={() => void open(item)}><FolderOpen />{busy === item.id ? 'Aguarde…' : 'Abrir'}</Button><Button variant="ghost" disabled={Boolean(busy)} onClick={() => void remove(item)} aria-label={`Excluir análise ${item.name}`}><Trash2 /><span className="hidden sm:inline">Excluir</span></Button></div></li>)}</ul></section>}
    {hasMore && <Button variant="outline" className="justify-self-center" disabled={Boolean(busy)} onClick={() => void more()}>{busy === 'more' ? 'Carregando…' : 'Carregar mais'}</Button>}
  </main>
}
