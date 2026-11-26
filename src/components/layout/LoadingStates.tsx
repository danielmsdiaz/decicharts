import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

function LoadingState({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return <div className={className} role="status" aria-label={label}>
    <span className="sr-only">{label}</span><div aria-hidden="true">{children}</div>
  </div>
}

export function AnalysisListSkeleton({ append = false }: { append?: boolean }) {
  return <LoadingState label={append ? 'Carregando mais análises…' : 'Carregando suas análises…'} className={append ? 'border-t' : 'panel overflow-hidden'}>
    {Array.from({ length: append ? 2 : 3 }, (_, index) => <div className="analysis-row" key={index}>
      <div className="min-w-0 flex-1 space-y-3"><Skeleton className={index === 1 ? 'h-5 w-2/5' : 'h-5 w-3/5'} /><Skeleton className="h-4 w-3/4 max-w-lg" /><Skeleton className="h-4 w-1/2 max-w-sm" /></div>
      <div className="flex gap-2"><Skeleton className="h-11 w-22" /><Skeleton className="h-11 w-22" /></div>
    </div>)}
  </LoadingState>
}

export function PreferencesSkeleton() {
  return <LoadingState label="Carregando preferências…" className="mt-6">
    <div className="grid max-w-2xl gap-5 sm:grid-cols-2">{[0, 1].map(index => <div className="space-y-2" key={index}><Skeleton className="h-5 w-36" /><Skeleton className="h-11 w-full" /></div>)}</div>
    <Skeleton className="mt-6 h-11 w-46" />
  </LoadingState>
}

export function ChartSkeleton() {
  return <LoadingState label="Preparando a visualização…" className="panel overflow-hidden">
    <div className="chart-heading"><div className="min-w-0 flex-1 space-y-3"><Skeleton className="h-6 w-3/4 max-w-sm" /><Skeleton className="h-4 w-1/2 max-w-xs" /><Skeleton className="h-4 w-36" /></div><div className="chart-actions"><Skeleton className="h-11 w-36" /><Skeleton className="h-11 w-36" /></div></div>
    <div className="chart-body"><div className="flex flex-wrap gap-x-7 gap-y-3 py-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-5 w-36" /></div><div className="chart-stats">{[0, 1, 2, 3].map(index => <div className="space-y-3" key={index}><Skeleton className="h-4 w-3/4 max-w-32" /><Skeleton className="h-7 w-4/5 max-w-36" /></div>)}</div><Skeleton className="my-4 h-[388px] w-full sm:h-[448px]" /></div>
  </LoadingState>
}

export function PageSkeleton({ page = 'session' }: { page?: 'session' | 'analysis' | 'history' | 'profile' }) {
  return <main className="dashboard-shell" aria-busy="true">
    {page === 'session' ? <Skeleton className="h-8 w-56" /> : <div className="dashboard-heading"><h1>{page === 'history' ? 'Minhas análises' : page === 'profile' ? 'Meu perfil' : 'Análise de ruído'}</h1>{page === 'history' && <Skeleton className="h-11 w-28" />}</div>}
    {page === 'history' ? <AnalysisListSkeleton /> : page === 'profile' ? <>
      <div className="profile-identity" aria-hidden="true"><div className="flex items-center gap-4"><Skeleton className="size-14 rounded-full" /><div className="space-y-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-48" /></div></div></div>
      <section className="profile-settings"><h2 className="text-lg font-semibold">Preferências de leitura</h2><PreferencesSkeleton /></section>
    </> : <LoadingState label={page === 'session' ? 'Recuperando sua sessão…' : 'Carregando página…'}><div className="upload-zone"><Skeleton className="size-12" /><Skeleton className="mt-6 h-6 w-48" /><Skeleton className="mt-3 h-4 w-3/4 max-w-sm" /><Skeleton className="mt-6 h-11 w-44" /><Skeleton className="mt-6 h-6 w-36" /></div></LoadingState>}
  </main>
}
