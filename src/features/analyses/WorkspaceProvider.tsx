import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import type { MeasurementDataset } from '@/features/measurements/types'
import { fullRange } from '@/features/measurements/statistics'
import type { AnalysisSummary, ChartView, StoredAnalysis } from '../../../shared/persistence'
import { saveAnalysis } from './service'
import { WorkspaceContext } from './workspace-context'

interface Entry {
  key: string; dataset: MeasurementDataset; view: ChartView; saved: AnalysisSummary | null
  saving: boolean; progress: number; saveError: string; draftId: string
}
const isDirty = (entry: Entry) => !entry.saved || JSON.stringify(entry.saved.chart) !== JSON.stringify(entry.view)
function entryFor(dataset: MeasurementDataset, stored?: StoredAnalysis): Entry {
  const point = dataset.point
  return {
    key: crypto.randomUUID(), dataset, saved: stored?.analysis ?? null,
    view: stored?.analysis.chart ?? {
      title: point?.monitoringTitle?.slice(0, 100) ?? 'Série temporal de nível sonoro',
      range: fullRange(dataset.measurements)!,
      report: { enterprise: point?.enterprise ?? '', address: point?.address ?? '', east: point?.east ?? '', north: point?.north ?? '' },
    },
    saving: false, progress: 0, saveError: '', draftId: crypto.randomUUID(),
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, setLogoutGuard } = useAuth()
  const [state, setState] = useState<{ entries: Entry[]; active: string | null; revision: number }>({ entries: [], active: null, revision: 0 })
  const current = useRef(state)
  const controllers = useRef(new Map<string, AbortController>())
  function replace(next: typeof state) { current.current = next; setState(next) }
  function modify(key: string, update: (entry: Entry) => Entry) {
    replace({ ...current.current, entries: current.current.entries.map(entry => entry.key === key ? update(entry) : entry) })
  }
  function cancelAll() { controllers.current.forEach(controller => controller.abort()); controllers.current.clear() }
  useEffect(() => { const pending = controllers.current; return () => { pending.forEach(controller => controller.abort()); pending.clear() } }, [])
  const anyDirty = state.entries.some(isDirty)
  useEffect(() => {
    if (!anyDirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [anyDirty])
  useEffect(() => {
    setLogoutGuard?.(() => !current.current.entries.some(isDirty) || window.confirm('Sair da conta? Há pontos ou alterações ainda não salvos nesta sessão.'))
    return () => setLogoutGuard?.(null)
  }, [setLogoutGuard])
  const active = state.entries.find(entry => entry.key === state.active)
  function accept(dataset: MeasurementDataset, stored?: StoredAnalysis) {
    cancelAll()
    const entry = entryFor(dataset, stored)
    replace({ entries: [entry], active: entry.key, revision: current.current.revision + 1 })
  }
  function acceptMany(datasets: MeasurementDataset[], selected?: MeasurementDataset) {
    cancelAll()
    const entries = datasets.filter(data => data.validRecords > 0).map(data => entryFor(data))
    const active = entries.find(entry => entry.dataset === selected) ?? entries[0]
    replace({ entries, active: active?.key ?? null, revision: current.current.revision + 1 })
  }
  function clear() { cancelAll(); replace({ entries: [], active: null, revision: current.current.revision + 1 }) }
  async function save() {
    const entry = current.current.entries.find(item => item.key === current.current.active)
    if (!user || !entry || entry.saving) return
    const operation = new AbortController()
    controllers.current.set(entry.key, operation)
    modify(entry.key, value => ({ ...value, saving: true, saveError: '', progress: 0 }))
    try {
      const result = await saveAnalysis(user, entry.dataset, entry.view, entry.saved?.id ?? entry.draftId, Boolean(entry.saved), operation.signal,
        count => { if (!operation.signal.aborted) modify(entry.key, value => ({ ...value, progress: count })) })
      if (!operation.signal.aborted) modify(entry.key, value => ({ ...value, saved: result.analysis,
        view: JSON.stringify(value.view) === JSON.stringify(entry.view) ? result.analysis.chart : value.view }))
    } catch (issue) {
      if (!operation.signal.aborted) modify(entry.key, value => ({ ...value, saveError: issue instanceof Error ? issue.message : 'Não foi possível salvar. Tente novamente.' }))
    } finally {
      if (!operation.signal.aborted) modify(entry.key, value => ({ ...value, saving: false }))
      controllers.current.delete(entry.key)
    }
  }
  return <WorkspaceContext.Provider value={{
    dataset: active?.dataset ?? null, view: active?.view ?? null, saved: active?.saved ?? null,
    saving: active?.saving ?? false, progress: active?.progress ?? 0, saveError: active?.saveError ?? '',
    dirty: active ? isDirty(active) : false, anyDirty, revision: state.revision, activeKey: state.active,
    points: state.entries.map(entry => ({ key: entry.key, id: entry.dataset.point?.id ?? entry.dataset.fileName,
      count: entry.dataset.validRecords, saved: Boolean(entry.saved), dirty: isDirty(entry), saving: entry.saving })),
    selectPoint: key => { if (current.current.entries.some(entry => entry.key === key)) replace({ ...current.current, active: key, revision: current.current.revision + 1 }) },
    setView: view => { if (active) modify(active.key, entry => ({ ...entry, view })) },
    accept, acceptMany, clear, save,
    detach: id => replace({ ...current.current, entries: current.current.entries.map(entry => entry.saved?.id === id ? { ...entry, saved: null, draftId: crypto.randomUUID() } : entry) }),
  }}>{children}</WorkspaceContext.Provider>
}
