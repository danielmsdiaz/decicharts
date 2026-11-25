import { parseFile } from './parser'
import { normalizeSheet } from './normalize'
import { discoverPoints, normalizePoint, normalizePoints } from './points'
import { MAX_RECORDS } from './validation'
import type { ColumnMapping, ImportSource } from '@/features/measurements/types'

let source: ImportSource | null = null
const collections = new Map<number, import('@/features/measurements/types').MeasurementDataset[]>()
self.onmessage = (event: MessageEvent<{ id: number; type: 'read'; buffer: ArrayBuffer; fileName: string } | { id: number; type: 'normalize'; sheetIndex: number; mapping: ColumnMapping; pointIndex?: number } | { id: number; type: 'points'; sheetIndex: number; defaults: { timezone: string; unit: string } }>) => {
  const message = event.data
  try {
    if (message.type === 'read') {
      source = parseFile(message.buffer, message.fileName)
      collections.clear()
      for (const sheet of source.sheets) sheet.points = discoverPoints(sheet)
      self.postMessage({ id: message.id, type: 'source', source: { fileName: source.fileName, sheets: source.sheets.map(sheet => ({ ...sheet, rows: sheet.rows.slice(0, 110) })) } })
    } else {
      if (!source?.sheets[message.sheetIndex]) throw new Error('Selecione novamente o arquivo para continuar.')
      const sheet = source.sheets[message.sheetIndex]
      if (message.type === 'points') {
        const datasets = normalizePoints(source.fileName, sheet, message.defaults)
        collections.set(message.sheetIndex, datasets)
        self.postMessage({ id: message.id, type: 'datasets', datasets })
      } else {
        const point = sheet.points?.[message.pointIndex ?? 0]
        const dataset = point ? normalizePoint(source.fileName, sheet, point, message.mapping) : normalizeSheet(source.fileName, sheet, message.mapping)
        const previous = collections.get(message.sheetIndex) ?? []
        const datasets = [...previous]
        datasets[message.pointIndex ?? 0] = dataset
        if (datasets.reduce((sum, data) => sum + data.validRecords, 0) > MAX_RECORDS) throw new Error('A aba excede 250 mil medições somando todos os pontos.')
        collections.set(message.sheetIndex, datasets)
        self.postMessage({ id: message.id, type: 'dataset', dataset, pointIndex: message.pointIndex ?? 0 })
      }
    }
  } catch (error) {
    self.postMessage({ id: message.id, type: 'error', error: error instanceof Error ? error.message : 'Não foi possível processar o arquivo.' })
  }
}
