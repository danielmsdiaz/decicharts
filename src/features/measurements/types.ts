export interface Measurement { timestamp: number; value: number }
export type Cell = string | number | boolean | null
export interface SheetData { name: string; rows: Cell[][]; date1904: boolean }
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
}
export interface InvalidRecord { row: number; reason: string; original: Cell[] }
export interface PreviewRecord { row: number; original: Cell[]; timestamp?: number; value?: number; reason?: string }
export interface MeasurementDataset {
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
