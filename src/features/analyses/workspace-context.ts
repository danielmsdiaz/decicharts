import { createContext, useContext } from 'react'
import type { MeasurementDataset } from '@/features/measurements/types'
import type { AnalysisSummary, ChartView, StoredAnalysis } from '../../../shared/persistence'

export interface WorkspaceState {
  dataset: MeasurementDataset | null
  view: ChartView | null
  revision: number
  saved: AnalysisSummary | null
  saving: boolean
  progress: number
  saveError: string
  dirty: boolean
  anyDirty: boolean
  points: { key: string; id: string; count: number; saved: boolean; dirty: boolean; saving: boolean }[]
  activeKey: string | null
  selectPoint: (key: string) => void
  acceptMany: (datasets: MeasurementDataset[], active?: MeasurementDataset) => void
  setView: (view: ChartView) => void
  accept: (dataset: MeasurementDataset, stored?: StoredAnalysis) => void
  clear: () => void
  save: () => Promise<void>
  detach: (id: string) => void
}
export const WorkspaceContext = createContext<WorkspaceState | null>(null)
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace requer WorkspaceProvider.')
  return context
}
