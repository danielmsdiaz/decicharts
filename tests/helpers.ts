import type { ColumnMapping, MeasurementDataset } from '../src/features/measurements/types'

export function mapping(overrides: Partial<ColumnMapping> = {}): ColumnMapping {
  return { headerRow: 0, dateColumn: 0, timeColumn: null, valueColumn: 1, dateFormat: 'br', decimal: ',', referenceDate: '', timeOnly: false, timezone: 'America/Recife', unit: 'dB', ...overrides }
}
export function dataset(): MeasurementDataset {
  return { fileName: 'medicao.csv', sheetName: 'CSV', measurements: [{ timestamp: 1735700400000, value: 50 }, { timestamp: 1735700401000, value: 60 }, { timestamp: 1735700402000, value: 55 }], totalRecords: 3, validRecords: 3, invalidRecords: 0, duplicateTimestamps: 0, unit: 'dB(A)', timezone: 'America/Recife', mapping: mapping(), preview: [], invalidPreview: [] }
}
