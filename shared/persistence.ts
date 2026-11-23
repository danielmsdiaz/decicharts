import type { ColumnMapping, MeasurementDataset, TimeRange } from '../src/features/measurements/types'

export const CHUNK_SIZE = 5_000
export const MAX_POINTS = 250_000
export interface Preferences { timezone: string; unit: string }
export const DEFAULT_PREFERENCES: Preferences = { timezone: 'America/Recife', unit: 'dB' }
export interface UserProfile { uid: string; name: string | null; email: string | null; photoURL: string | null; preferences: Preferences }
export interface ChartView { title: string; range: TimeRange }
export interface DatasetMetadata {
  fileName: string
  sheetName: string
  totalRecords: number
  validRecords: number
  invalidRecords: number
  duplicateTimestamps: number
  unit: string
  timezone: string
  mapping: ColumnMapping
  invalidPreview: { row: number; reason: string }[]
}
export interface AnalysisSummary {
  id: string
  name: string
  fileName: string
  count: number
  start: number
  end: number
  unit: string
  timezone: string
  updatedAt: string
  chart: ChartView
}
export interface StoredAnalysis { analysis: AnalysisSummary; metadata: DatasetMetadata; chunkCount: number }
export interface AnalysisPage { analyses: AnalysisSummary[]; total: number; hasMore: boolean }
export type PointTuple = [number, number]
export function metadataFromDataset(dataset: MeasurementDataset): DatasetMetadata {
  return {
    fileName: dataset.fileName, sheetName: dataset.sheetName,
    totalRecords: dataset.totalRecords, validRecords: dataset.validRecords,
    invalidRecords: dataset.invalidRecords, duplicateTimestamps: dataset.duplicateTimestamps,
    unit: dataset.unit, timezone: dataset.timezone, mapping: dataset.mapping,
    invalidPreview: dataset.invalidPreview.slice(0, 100).map(({ row, reason }) => ({ row, reason })),
  }
}
