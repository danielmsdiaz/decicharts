import { lazy, Suspense } from 'react'
import { useOutletContext } from 'react-router'
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { FileImport } from '@/features/file-import/FileImport'
import { useAuth } from '@/features/auth/auth-context'
import type { MeasurementDataset } from './types'
import { useWorkspace } from '@/features/analyses/workspace-context'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { HelpTooltip } from '@/components/ui/help-tooltip'

const ChartWorkspace = lazy(() => import('@/features/charts/ChartWorkspace'))
export function Dashboard() {
  const workspace = useWorkspace()
  const { dataset, revision } = workspace
  const { theme } = useOutletContext<{ theme: string }>()
  const { error } = useAuth()
  const activeIndex = workspace.points.findIndex(point => point.key === workspace.activeKey)
  function stepPoint(direction: number) {
    const point = workspace.points[activeIndex + direction]
    if (point) workspace.selectPoint(point.key)
  }
  function accept(next: MeasurementDataset, all?: MeasurementDataset[]) {
    if (workspace.anyDirty && !window.confirm('Substituir o arquivo atual? Há pontos ou alterações não salvos nesta sessão.')) return false
    workspace.acceptMany(all?.length ? all : [next], next); return true
  }
  function remove() { if (!workspace.anyDirty || window.confirm('Remover o arquivo desta sessão? Os pontos não salvos serão perdidos.')) workspace.clear() }
  return <main className="dashboard-shell">
    <div className="dashboard-heading"><div><h1 className="text-3xl font-semibold tracking-tight">Análise de ruído</h1>{!dataset && <p className="mt-2 text-sm leading-6 text-muted-foreground">Importe suas medições e acompanhe o nível sonoro ao longo do tempo.</p>}</div><span className="local-badge"><ShieldCheck className="size-4" aria-hidden="true" />Processamento local<HelpTooltip label="Sobre o processamento local">O arquivo é lido neste navegador. Somente os pontos que você salvar são enviados à sua conta.</HelpTooltip></span></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    <FileImport dataset={dataset} saved={Boolean(workspace.saved)} onImport={accept} onRemove={remove} />
    {workspace.points.length > 1 && <section className="point-switcher" aria-label="Pontos do arquivo">
      <div className="point-control"><div className="field-label"><label htmlFor="monitoring-point">Ponto de medição</label><HelpTooltip label="Sobre os pontos de medição">Cada ponto é salvo separadamente. Seus ajustes permanecem ao alternar nesta sessão.</HelpTooltip></div>
        <div className="point-navigation"><Button variant="outline" size="icon" aria-label="Ponto anterior" disabled={activeIndex <= 0} onClick={() => stepPoint(-1)}><ChevronLeft /></Button>
          <Select id="monitoring-point" aria-label="Ponto de medição" value={workspace.activeKey ?? ''} onChange={event => workspace.selectPoint(event.target.value)}>{workspace.points.map(point => <option key={point.key} value={point.key}>{point.id} · {point.count.toLocaleString('pt-BR')} medições · {point.saving ? 'salvando' : point.dirty ? 'não salvo' : 'salvo'}</option>)}</Select>
          <Button variant="outline" size="icon" aria-label="Próximo ponto" disabled={activeIndex >= workspace.points.length - 1} onClick={() => stepPoint(1)}><ChevronRight /></Button>
          <span className="point-position tabular-nums" aria-live="polite">{activeIndex + 1} / {workspace.points.length}</span>
        </div>
      </div>
    </section>}
    {dataset && <Suspense fallback={<div className="panel p-8" role="status" aria-busy="true">Preparando a visualização…<div className="mt-6 h-80 rounded-lg bg-accent" /></div>}><ChartWorkspace key={revision} dataset={dataset} dark={theme === 'dark'} /></Suspense>}
  </main>
}
