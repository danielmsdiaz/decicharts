import { lazy, Suspense } from 'react'
import { useOutletContext } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { FileImport } from '@/features/file-import/FileImport'
import { useAuth } from '@/features/auth/auth-context'
import type { MeasurementDataset } from './types'
import { useWorkspace } from '@/features/analyses/workspace-context'
import { Select } from '@/components/ui/select'

const ChartWorkspace = lazy(() => import('@/features/charts/ChartWorkspace'))
export function Dashboard() {
  const workspace = useWorkspace()
  const { dataset, revision } = workspace
  const { theme } = useOutletContext<{ theme: string }>()
  const { error } = useAuth()
  function accept(next: MeasurementDataset, all?: MeasurementDataset[]) {
    if (workspace.anyDirty && !window.confirm('Substituir o arquivo atual? Há pontos ou alterações não salvos nesta sessão.')) return false
    workspace.acceptMany(all?.length ? all : [next], next); return true
  }
  function remove() { if (!workspace.anyDirty || window.confirm('Remover o arquivo desta sessão? Os pontos não salvos serão perdidos.')) workspace.clear() }
  return <main className="dashboard-shell">
    <div className="dashboard-heading"><div><h1 className="text-3xl font-semibold tracking-tight">Análise de ruído</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Importe suas medições e acompanhe o nível sonoro ao longo do tempo.</p></div><span className="local-badge"><ShieldCheck className="size-4" aria-hidden="true" />Processamento local</span></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    <FileImport dataset={dataset} saved={Boolean(workspace.saved)} onImport={accept} onRemove={remove} />
    {workspace.points.length > 1 && <section className="point-switcher" aria-label="Pontos do arquivo"><label className="field">Ponto de medição<Select aria-label="Ponto de medição" value={workspace.activeKey ?? ''} onChange={event => workspace.selectPoint(event.target.value)}>{workspace.points.map(point => <option key={point.key} value={point.key}>{point.id} · {point.count.toLocaleString('pt-BR')} medições · {point.saving ? 'salvando' : point.dirty ? 'não salvo' : 'salvo'}</option>)}</Select></label><p className="text-sm text-muted-foreground">Cada ponto é salvo separadamente. Seus ajustes permanecem ao alternar nesta sessão.</p></section>}
    {dataset && <Suspense fallback={<div className="panel p-8" role="status" aria-busy="true">Preparando a visualização…<div className="mt-6 h-80 rounded-lg bg-accent" /></div>}><ChartWorkspace key={revision} dataset={dataset} dark={theme === 'dark'} /></Suspense>}
  </main>
}
