import { lazy, Suspense, useState } from 'react'
import { useOutletContext } from 'react-router'
import { Check, ChevronLeft, ChevronRight, FilePlus2, Save } from 'lucide-react'
import { FileImport } from '@/features/file-import/FileImport'
import { useAuth } from '@/features/auth/auth-context'
import type { MeasurementDataset } from './types'
import { useWorkspace } from '@/features/analyses/workspace-context'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { useConfirmation } from '@/components/ui/confirmation-context'
import { ChartSkeleton } from '@/components/layout/LoadingStates'
import { useReport } from '@/features/reports/report-context'

const ChartWorkspace = lazy(() => import('@/features/charts/ChartWorkspace'))
const ReportEditorPage = lazy(() => import('@/features/reports/ReportEditorPage'))
export function Dashboard() {
  const workspace = useWorkspace()
  const report = useReport()
  const [editingDocument, setEditingDocument] = useState(false)
  const confirm = useConfirmation()
  const { dataset, revision } = workspace
  const { theme } = useOutletContext<{ theme: string }>()
  const { error } = useAuth()
  const activeIndex = workspace.points.findIndex(point => point.key === workspace.activeKey)
  const hasDocument = report.document.rows.length > 0
  function stepPoint(direction: number) {
    const point = workspace.points[activeIndex + direction]
    if (point) workspace.selectPoint(point.key)
  }
  async function accept(next: MeasurementDataset, all?: MeasurementDataset[]) {
    if ((workspace.anyDirty || hasDocument) && !await confirm({ title: 'Substituir o arquivo?', description: hasDocument ? 'Os pontos, alterações e o documento desta aba serão descartados. Exporte o Word antes de substituir o arquivo.' : 'Os pontos e alterações não salvos do arquivo atual serão descartados.', confirmLabel: 'Substituir arquivo' })) return false
    workspace.acceptMany(all?.length ? all : [next], next); report.clear(); return true
  }
  async function remove() {
    if ((workspace.anyDirty || hasDocument) && !await confirm({ title: 'Fechar este arquivo?', description: hasDocument ? 'Os pontos, alterações e o documento desta aba serão descartados. Exporte o Word antes de fechar. A análise salva continua na sua conta.' : 'Os pontos e alterações não salvos serão descartados. As análises já salvas não serão excluídas.', confirmLabel: 'Fechar arquivo' })) return false
    workspace.clear(); report.clear(); return true
  }
  async function openDocument() {
    if (report.document.analysisId !== workspace.importId) {
      if (report.document.rows.length && !await confirm({ title: 'Criar documento desta análise?', description: 'Há um documento de outra análise nesta aba. Exporte-o antes de continuar para guardar seu conteúdo.', confirmLabel: 'Criar documento' })) return
      report.clear(workspace.importId, workspace.name || 'Medições de ruído')
    }
    setEditingDocument(true)
  }
  if (editingDocument && dataset) return <Suspense fallback={<ChartSkeleton />}><ReportEditorPage onBack={() => setEditingDocument(false)} /></Suspense>
  return <main className="dashboard-shell">
    <div className="dashboard-heading"><div className="page-title"><h1 className="text-3xl font-semibold tracking-tight">Análise de ruído</h1><HelpTooltip label="Sobre o processamento local">O arquivo é lido neste navegador. Salvar análise envia todos os pontos da aba importada à sua conta.</HelpTooltip></div>{dataset && <Button variant="outline" onClick={() => void openDocument()}><FilePlus2 />{report.document.analysisId === workspace.importId && report.document.rows.length ? 'Editar documento' : 'Criar documento'}</Button>}</div>
    {error && <p className="notice error" role="alert">{error}</p>}
    <FileImport dataset={dataset} saved={Boolean(workspace.saved)} onImport={accept} onRemove={remove}
      pointCount={workspace.points.length} recordCount={workspace.points.reduce((sum, point) => sum + point.count, 0)}
      actions={<Button disabled={workspace.saving || !workspace.dirty || !workspace.name.trim() || workspace.saveConflict} onClick={() => void workspace.save()}>
        {workspace.saved && !workspace.dirty ? <Check /> : <Save />}{workspace.saving ? 'Salvando…' : workspace.saved && !workspace.dirty ? 'Análise salva' : workspace.saveError ? 'Tentar salvar novamente' : workspace.saved ? 'Salvar alterações' : 'Salvar análise'}
      </Button>} />
    {dataset && <section className="import-workspace-settings" aria-label="Ajustes da análise">
      <label className="field max-w-lg">Nome da análise<Input maxLength={100} value={workspace.name} onChange={event => workspace.setName(event.target.value)} /></label>
      {workspace.saveError && <div className="notice error" role="alert"><p>{workspace.saveError}</p>{workspace.saveConflict && <Button variant="outline" className="mt-3" disabled={workspace.saving} onClick={() => void workspace.reopenSaved()}>Reabrir versão salva</Button>}</div>}
      {workspace.saving && <p role="status" className="text-sm">{workspace.progress ? workspace.progress.publishing ? 'Concluindo o salvamento de todos os pontos…' : `${workspace.progress.points} de ${workspace.progress.totalPoints} pontos prontos · ${workspace.progress.records.toLocaleString('pt-BR')} de ${workspace.progress.totalRecords.toLocaleString('pt-BR')} medições` : 'Preparando a análise…'}</p>}
      {workspace.saved && workspace.dirty && !workspace.saving && <p role="status" className="text-sm text-primary">Alterações não salvas.</p>}
    </section>}
    {workspace.points.length > 1 && <section className="point-switcher" aria-label="Pontos do arquivo">
      <div className="point-control"><div className="field-label"><label htmlFor="monitoring-point">Ponto de medição</label><HelpTooltip label="Sobre os pontos de medição">Todos os pontos são salvos juntos na análise. Cada ponto conserva seus próprios ajustes ao alternar e reabrir.</HelpTooltip></div>
        <div className="point-navigation"><Button variant="outline" size="icon" aria-label="Ponto anterior" disabled={activeIndex <= 0} onClick={() => stepPoint(-1)}><ChevronLeft /></Button>
          <Select id="monitoring-point" aria-label="Ponto de medição" value={workspace.activeKey ?? ''} onChange={event => workspace.selectPoint(event.target.value)}>{workspace.points.map(point => <option key={point.key} value={point.key}>{point.id} · {point.count.toLocaleString('pt-BR')} medições · {point.saving ? 'salvando' : point.dirty ? 'não salvo' : 'salvo'}</option>)}</Select>
          <Button variant="outline" size="icon" aria-label="Próximo ponto" disabled={activeIndex >= workspace.points.length - 1} onClick={() => stepPoint(1)}><ChevronRight /></Button>
          <span className="point-position tabular-nums" aria-live="polite">{activeIndex + 1} / {workspace.points.length}</span>
        </div>
      </div>
    </section>}
    {dataset && <Suspense fallback={<ChartSkeleton />}><ChartWorkspace key={revision} dataset={dataset} dark={theme === 'dark'} /></Suspense>}
  </main>
}
