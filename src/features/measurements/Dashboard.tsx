import { lazy, Suspense } from 'react'
import { useOutletContext } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { FileImport } from '@/features/file-import/FileImport'
import { useAuth } from '@/features/auth/auth-context'
import type { MeasurementDataset } from './types'
import { useWorkspace } from '@/features/analyses/workspace-context'

const ChartWorkspace = lazy(() => import('@/features/charts/ChartWorkspace'))
export function Dashboard() {
  const workspace = useWorkspace()
  const { dataset, revision } = workspace
  const { theme } = useOutletContext<{ theme: string }>()
  const { error } = useAuth()
  function accept(next: MeasurementDataset) {
    if (dataset && !window.confirm('Substituir a série atual? As medições anteriores serão removidas desta sessão.')) return false
    workspace.accept(next); return true
  }
  return <main className="dashboard-shell">
    <div className="dashboard-heading"><div><h1 className="text-3xl font-semibold tracking-tight">Análise de ruído</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Importe suas medições e acompanhe o nível sonoro ao longo do tempo.</p></div><span className="local-badge"><ShieldCheck className="size-4" aria-hidden="true" />Processamento local</span></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    <FileImport dataset={dataset} saved={Boolean(workspace.saved)} onImport={accept} onRemove={workspace.clear} />
    {dataset && <Suspense fallback={<div className="panel p-8" role="status" aria-busy="true">Preparando a visualização…<div className="mt-6 h-80 rounded-lg bg-accent" /></div>}><ChartWorkspace key={revision} dataset={dataset} dark={theme === 'dark'} /></Suspense>}
  </main>
}
