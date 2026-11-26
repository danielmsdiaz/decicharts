import { createContext, useContext } from 'react'
import type { ReportAsset, ReportDocument } from './model'

export interface ReportWorkspace {
  document: ReportDocument
  assets: ReadonlyMap<string, ReportAsset>
  change: (update: (doc: ReportDocument) => ReportDocument, group?: string) => void
  addAssets: (assets: ReportAsset[], update: (doc: ReportDocument) => ReportDocument) => void
  clear: (analysisId?: string, name?: string) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}
export const ReportContext = createContext<ReportWorkspace | null>(null)
export function useReport() {
  const value = useContext(ReportContext)
  if (!value) throw new Error('useReport requer ReportProvider.')
  return value
}
