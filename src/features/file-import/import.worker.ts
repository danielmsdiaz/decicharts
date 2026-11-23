import { parseFile } from './parser'
import { normalizeSheet } from './normalize'
import type { ColumnMapping, ImportSource } from '@/features/measurements/types'

let source: ImportSource | null = null
self.onmessage = (event: MessageEvent<{ id: number; type: 'read'; buffer: ArrayBuffer; fileName: string } | { id: number; type: 'normalize'; sheetIndex: number; mapping: ColumnMapping }>) => {
  const message = event.data
  try {
    if (message.type === 'read') {
      source = parseFile(message.buffer, message.fileName)
      self.postMessage({ id: message.id, type: 'source', source: { fileName: source.fileName, sheets: source.sheets.map(sheet => ({ ...sheet, rows: sheet.rows.slice(0, 110) })) } })
    } else {
      if (!source?.sheets[message.sheetIndex]) throw new Error('Selecione novamente o arquivo para continuar.')
      const dataset = normalizeSheet(source.fileName, source.sheets[message.sheetIndex], message.mapping)
      self.postMessage({ id: message.id, type: 'dataset', dataset })
    }
  } catch (error) {
    self.postMessage({ id: message.id, type: 'error', error: error instanceof Error ? error.message : 'Não foi possível processar o arquivo.' })
  }
}
