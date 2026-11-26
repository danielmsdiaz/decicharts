import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import type { MeasurementDataset } from '@/features/measurements/types'
import { fullRange } from '@/features/measurements/statistics'
import { MAX_POINTS, type ImportSummary, type ChartView, type LoadedImport } from '../../../shared/persistence'
import { loadImport, saveImport, type SaveSnapshot, type SaveProgress } from './import-service'
import { ApiError } from '@/lib/api'
import { WorkspaceContext } from './workspace-context'
import { useConfirmation } from '@/components/ui/confirmation-context'

interface Entry { key: string; dataset: MeasurementDataset; view: ChartView; savedChart: ChartView | null }
interface State {
  entries: Entry[]; active: string | null; revision: number; importId: string; name: string; saved: ImportSummary | null
  saving: boolean; progress: SaveProgress | null; saveError: string; conflict: boolean
}
const dirty = (entry: Entry) => !entry.savedChart || JSON.stringify(entry.savedChart) !== JSON.stringify(entry.view)
const changed = (state: State) => state.entries.length > 0 && (state.saving || !state.saved || state.name !== state.saved.name || state.entries.some(dirty))
const empty = (revision = 0): State => ({ entries: [], active: null, revision, importId: crypto.randomUUID(), name: '', saved: null, saving: false, progress: null, saveError: '', conflict: false })
function entryFor(dataset: MeasurementDataset, key: string = crypto.randomUUID(), savedChart: ChartView | null = null): Entry {
  const point = dataset.point
  return { key, dataset, savedChart, view: savedChart ?? {
    title: point?.monitoringTitle?.slice(0, 100) ?? 'Série temporal de nível sonoro', range: fullRange(dataset.measurements)!,
    report: { enterprise: point?.enterprise ?? '', address: point?.address ?? '', east: point?.east ?? '', north: point?.north ?? '' },
  } }
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, setLogoutGuard } = useAuth()
  const confirm = useConfirmation()
  const [state, setState] = useState<State>(() => empty())
  const current = useRef(state)
  const controller = useRef<AbortController | null>(null)
  const pending = useRef<SaveSnapshot | null>(null)
  function replace(next: State) { current.current = next; setState(next) }
  function update(value: Partial<State>) { replace({ ...current.current, ...value }) }
  function cancel() { controller.current?.abort(); controller.current = null; pending.current = null }
  useEffect(() => () => { controller.current?.abort() }, [])
  const anyDirty = changed(state)
  useEffect(() => {
    if (!anyDirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [anyDirty])
  useEffect(() => {
    setLogoutGuard?.(() => !changed(current.current) || confirm({ title: 'Sair da conta?', description: 'A importação e alterações não salvas serão descartadas. As análises salvas continuam na sua conta.', confirmLabel: 'Sair da conta' }))
    return () => setLogoutGuard?.(null)
  }, [setLogoutGuard, confirm])
  function acceptMany(datasets: MeasurementDataset[], selected?: MeasurementDataset) {
    if (!datasets.length || datasets.some(data => !data.validRecords) || datasets.reduce((sum, data) => sum + data.validRecords, 0) > MAX_POINTS) {
      throw new Error('Corrija todos os pontos: cada ponto precisa ter leituras válidas e o conjunto deve ter até 250 mil medições.')
    }
    cancel()
    const entries = datasets.map(data => entryFor(data))
    replace({ ...empty(current.current.revision + 1), entries, active: (entries.find(entry => entry.dataset === selected) ?? entries[0]).key,
      name: datasets[0].fileName.replace(/\.[^.]+$/, '').trim().slice(0, 100) || 'Nova análise' })
  }
  function acceptImport(value: LoadedImport) {
    if (!value.points.length || value.points.length !== value.summary.pointCount) throw new Error('A importação recebida está incompleta.')
    cancel()
    const entries = value.points.map(point => entryFor(point.dataset, point.stored.id, point.stored.chart))
    replace({ ...empty(current.current.revision + 1), entries, active: entries[0].key, importId: value.summary.id, name: value.summary.name, saved: value.summary })
  }
  function clear() { cancel(); replace(empty(current.current.revision + 1)) }
  async function save() {
    const before = current.current
    if (!user || !before.entries.length || before.saving || before.conflict || !before.name.trim()) return
    const snapshot = pending.current ?? {
      id: before.importId, saveId: crypto.randomUUID(), baseVersion: before.saved?.version ?? 0, name: before.name.trim(),
      points: before.entries.map((entry, ordinal) => ({ id: entry.key, ordinal, dataset: entry.dataset,
        view: structuredClone({ ...entry.view, title: entry.view.title.trim() || 'Série temporal de nível sonoro' }) })),
    }
    pending.current = snapshot
    const operation = new AbortController(); controller.current = operation
    update({ saving: true, saveError: '', progress: null })
    try {
      const result = await saveImport(user, snapshot, operation.signal, progress => { if (!operation.signal.aborted) update({ progress }) })
      if (operation.signal.aborted || current.current.importId !== snapshot.id) return
      replace({ ...current.current, saved: result, name: current.current.name.trim() === snapshot.name ? snapshot.name : current.current.name,
        entries: current.current.entries.map(entry => {
          const sent = snapshot.points.find(point => point.id === entry.key)!
          const matches = JSON.stringify({ ...entry.view, title: entry.view.title.trim() || 'Série temporal de nível sonoro' }) === JSON.stringify(sent.view)
          return { ...entry, savedChart: sent.view, view: matches ? sent.view : entry.view }
        }) })
      pending.current = null
    } catch (issue) {
      if (!operation.signal.aborted) update({ saveError: issue instanceof Error ? issue.message : 'Não foi possível salvar. Tente novamente.',
        conflict: issue instanceof ApiError && issue.status === 409 && issue.message.startsWith('A análise foi alterada') })
    } finally {
      if (!operation.signal.aborted) update({ saving: false })
      if (controller.current === operation) controller.current = null
    }
  }
  async function reopenSaved() {
    if (!user || current.current.saving) return
    const id = current.current.importId
    const operation = new AbortController(); controller.current = operation
    update({ saving: true })
    try {
      const value = await loadImport(user, id, operation.signal)
      if (operation.signal.aborted || current.current.importId !== id) return
      if (await confirm({ title: 'Reabrir a versão salva?', description: 'Todos os ajustes locais serão substituídos pela versão atual da sua conta.', confirmLabel: 'Reabrir análise' })) acceptImport(value)
    } catch (issue) { if (!operation.signal.aborted) update({ saveError: issue instanceof Error ? issue.message : 'Não foi possível reabrir a análise.' }) }
    finally { if (!operation.signal.aborted) update({ saving: false }); if (controller.current === operation) controller.current = null }
  }
  const active = state.entries.find(entry => entry.key === state.active)
  return <WorkspaceContext.Provider value={{
    dataset: active?.dataset ?? null, view: active?.view ?? null, saved: state.saved,
    name: state.name, setName: name => update({ name }), saving: state.saving, progress: state.progress, saveError: state.saveError,
    saveConflict: state.conflict, reopenSaved, dirty: anyDirty, anyDirty, revision: state.revision, activeKey: state.active,
    points: state.entries.map(entry => ({ key: entry.key, id: entry.dataset.point?.id ?? entry.dataset.fileName,
      count: entry.dataset.validRecords, saved: !!entry.savedChart, dirty: dirty(entry), saving: state.saving })),
    selectPoint: key => { if (current.current.entries.some(entry => entry.key === key)) update({ active: key, revision: current.current.revision + 1 }) },
    setView: view => { if (active) update({ entries: current.current.entries.map(entry => entry.key === active.key ? { ...entry, view } : entry) }) },
    acceptImport, acceptMany, clear, save,
    detach: id => {
      if (current.current.importId !== id) return
      cancel()
      replace({ ...current.current, importId: crypto.randomUUID(), saved: null, saving: false, progress: null, saveError: '', conflict: false,
        entries: current.current.entries.map(entry => ({ ...entry, key: crypto.randomUUID(), savedChart: null })), active: null, revision: current.current.revision + 1 })
      update({ active: current.current.entries[0]?.key ?? null })
    },
  }}>{children}</WorkspaceContext.Provider>
}
