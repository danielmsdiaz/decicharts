import type { ColumnMapping, MeasurementDataset, PointInfo, TimeBasis, TimeRange } from '../src/features/measurements/types'

export const CHUNK_SIZE = 5_000
export const MAX_POINTS = 250_000
export interface Preferences { timezone: string; unit: string }
export const DEFAULT_PREFERENCES: Preferences = { timezone: 'America/Recife', unit: 'dB' }
export interface UserProfile { uid: string; name: string | null; email: string | null; photoURL: string | null; preferences: Preferences }
export interface ReportInfo {
  enterprise?: string; address?: string; east?: string; north?: string
  datum?: string; zone?: string; hemisphere?: string; startedAt?: string; logo?: string
  headerColor?: string; chartBackgroundColor?: string; lineColor?: string
}
export interface ChartView { title: string; range: TimeRange; report?: ReportInfo }
export interface DatasetMetadata {
  schemaVersion?: 2
  timeBasis?: TimeBasis
  point?: PointInfo
  sourceKind?: 'instantaneous'
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
  timeBasis?: TimeBasis
  pointId?: string
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
export interface ImportSummary {
  id: string; name: string; fileName: string; sheetName: string
  pointCount: number; recordCount: number; version: number; saveId: string | null; updatedAt: string
}
export interface ImportPage { imports: ImportSummary[]; total: number; hasMore: boolean }
export interface ImportInput { id: string; name: string; fileName: string; sheetName: string; pointCount: number; recordCount: number }
export interface SaveInput { id: string; baseVersion: number; name: string }
export interface SaveReceipt { id: string; state: 'uploading' | 'committed'; version: number | null; updatedAt?: string }
export interface ImportPointInput { ordinal: number; chart: ChartView; metadata?: DatasetMetadata }
export interface StoredImportPoint { id: string; ordinal: number; metadata: DatasetMetadata; chart: ChartView; chunkCount: number }
export interface ImportPointPage { points: StoredImportPoint[]; nextOffset: number | null }
export interface LoadedImport { summary: ImportSummary; points: { stored: StoredImportPoint; dataset: MeasurementDataset }[] }
export function metadataFromDataset(dataset: MeasurementDataset): DatasetMetadata {
  return {
    schemaVersion: 2, timeBasis: dataset.timeBasis ?? 'absolute', sourceKind: 'instantaneous',
    ...(dataset.point ? { point: dataset.point } : {}),
    fileName: dataset.fileName, sheetName: dataset.sheetName,
    totalRecords: dataset.totalRecords, validRecords: dataset.validRecords,
    invalidRecords: dataset.invalidRecords, duplicateTimestamps: dataset.duplicateTimestamps,
    unit: dataset.unit, timezone: dataset.timezone, mapping: dataset.mapping,
    invalidPreview: dataset.invalidPreview.slice(0, 100).map(({ row, reason }) => ({ row, reason })),
  }
}
