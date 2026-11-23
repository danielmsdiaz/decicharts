import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import type { MeasurementDataset } from '@/features/measurements/types'
import { fullRange } from '@/features/measurements/statistics'
import type { AnalysisSummary, ChartView, StoredAnalysis } from '../../../shared/persistence'
import { saveAnalysis } from './service'
import { WorkspaceContext } from './workspace-context'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [dataset, setDataset] = useState<MeasurementDataset | null>(null)
  const [view, setView] = useState<ChartView | null>(null)
  const [saved, setSaved] = useState<AnalysisSummary | null>(null)
  const [revision, setRevision] = useState(0)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [saveError, setSaveError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const draftId = useRef<string | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const dirty = Boolean(dataset && (!saved || JSON.stringify(saved.chart) !== JSON.stringify(view)))

  function accept(next: MeasurementDataset, stored?: StoredAnalysis) {
    controller.current?.abort()
    setSaving(false)
    setSaveError('')
    draftId.current = null
    setDataset(next)
    setView(stored?.analysis.chart ?? { title: 'Série temporal de nível sonoro', range: fullRange(next.measurements)! })
    setSaved(stored?.analysis ?? null)
    setRevision(value => value + 1)
  }
  function clear() {
    controller.current?.abort()
    setDataset(null); setView(null); setSaved(null); setSaving(false); setSaveError('')
    draftId.current = null
  }
  async function save() {
    if (!user || !dataset || !view || saving) return
    const operation = new AbortController()
    controller.current = operation
    setSaving(true); setSaveError(''); setProgress(0)
    draftId.current ??= crypto.randomUUID()
    try {
      const result = await saveAnalysis(user, dataset, view, saved?.id ?? draftId.current, Boolean(saved), operation.signal, setProgress)
      if (!operation.signal.aborted) {
        setSaved(result.analysis)
        setView(current => JSON.stringify(current) === JSON.stringify(view) ? result.analysis.chart : current)
        draftId.current = null
      }
    } catch (error) {
      if (!operation.signal.aborted) setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar a análise. Tente novamente.')
    } finally { if (!operation.signal.aborted) setSaving(false) }
  }
  function detach(id: string) { if (saved?.id === id) { setSaved(null); draftId.current = null } }
  return <WorkspaceContext.Provider value={{ dataset, view, revision, saved, saving, progress, saveError, dirty, setView, accept, clear, save, detach }}>{children}</WorkspaceContext.Provider>
}
