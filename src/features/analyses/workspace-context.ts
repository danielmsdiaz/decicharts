import { createContext, useContext } from 'react'
import type { MeasurementDataset } from '@/features/measurements/types'
import type { ImportSummary, ChartView, LoadedImport } from '../../../shared/persistence'
import type { SaveProgress } from './import-service'

export interface WorkspacePointSnapshot {
  key: string
  dataset: MeasurementDataset
  view: ChartView
  importId: string
  version: number | null
}

export interface WorkspaceState {
  importId: string
  dataset: MeasurementDataset | null
  view: ChartView | null
  revision: number
  saved: ImportSummary | null
  saving: boolean
  progress: SaveProgress | null
  saveError: string
  dirty: boolean
  anyDirty: boolean
  points: { key: string; id: string; count: number; saved: boolean; dirty: boolean; saving: boolean }[]
  activeKey: string | null
  selectPoint: (key: string) => void
  capturePoints: (keys: string[]) => WorkspacePointSnapshot[]
  acceptMany: (datasets: MeasurementDataset[], active?: MeasurementDataset) => void
  setView: (view: ChartView) => void
  acceptImport: (value: LoadedImport) => void
  name: string
  setName: (name: string) => void
  saveConflict: boolean
  reopenSaved: () => Promise<void>
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
