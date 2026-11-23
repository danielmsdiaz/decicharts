import { lazy, Suspense, useState } from 'react'
import { useOutletContext } from 'react-router'
import { ChartNoAxesCombined } from 'lucide-react'
import { FileImport } from '@/features/file-import/FileImport'
import { useAuth } from '@/features/auth/auth-context'
import type { MeasurementDataset } from './types'

const ChartWorkspace = lazy(() => import('@/features/charts/ChartWorkspace'))
export function Dashboard() {
  const [dataset, setDataset] = useState<MeasurementDataset | null>(null)
  const [revision, setRevision] = useState(0)
  const { theme } = useOutletContext<{ theme: string }>()
  const { error } = useAuth()
  function accept(next: MeasurementDataset) {
    if (dataset && !window.confirm('Substituir a série atual? As medições anteriores serão removidas desta sessão.')) return false
    setDataset(next); setRevision(current => current + 1); return true
  }
  return <main className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 sm:py-10">
    <div><h1 className="text-3xl font-semibold tracking-tight">Análise de ruído</h1><p className="mt-2 text-muted-foreground">Do arquivo ao gráfico, com cada medição no seu tempo.</p></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    <FileImport onImport={accept} hasDataset={Boolean(dataset)} />
    {dataset ? <Suspense fallback={<div className="panel p-8" role="status" aria-busy="true">Preparando a visualização…<div className="mt-6 h-80 rounded-lg bg-accent" /></div>}><ChartWorkspace key={revision} dataset={dataset} dark={theme === 'dark'} /></Suspense> : <section className="panel flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center"><ChartNoAxesCombined className="mb-4 size-9 text-muted-foreground" aria-hidden="true" /><h2 className="text-lg font-medium">Seu próximo gráfico começa aqui</h2><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Importe uma planilha, confira as colunas e selecione “Usar esta série”. Você poderá explorar o período e exportar o gráfico para seu relatório.</p></section>}
  </main>
}
