export interface Measurement { timestamp: number; value: number }
export type Cell = string | number | boolean | null
export type TimeBasis = 'absolute' | 'elapsed'
export type Weighting = 'unknown' | 'A' | 'C' | 'Z'
export interface PointInfo { id: string; address?: string; east?: string; north?: string; enterprise?: string; monitoringTitle?: string }
export interface PointCandidate { id: string; mapping: ColumnMapping; info: PointInfo }
export interface SheetData { name: string; rows: Cell[][]; date1904: boolean; merges?: { s: { r: number; c: number }; e: { r: number; c: number } }[]; points?: PointCandidate[]; pointsError?: string }
export interface ImportSource { fileName: string; sheets: SheetData[] }
export interface ColumnMapping {
  headerRow: number
  dateColumn: number
  timeColumn: number | null
  valueColumn: number
  dateFormat: 'br' | 'iso' | 'excel'
  decimal: ',' | '.'
  referenceDate: string
  timeOnly: boolean
  timezone: string
  unit: string
  timeBasis?: TimeBasis
  weighting?: Weighting
}
export interface InvalidRecord { row: number; reason: string; original: Cell[] }
export interface PreviewRecord { row: number; original: Cell[]; timestamp?: number; value?: number; reason?: string }
export interface MeasurementDataset {
  schemaVersion?: 2
  timeBasis?: TimeBasis
  point?: PointInfo
  sourceKind?: 'instantaneous'
  fileName: string
  sheetName: string
  measurements: Measurement[]
  totalRecords: number
  validRecords: number
  invalidRecords: number
  duplicateTimestamps: number
  unit: string
  timezone: string
  mapping: ColumnMapping
  invalidPreview: InvalidRecord[]
  preview: PreviewRecord[]
}
export interface TimeRange { start: number; end: number }
