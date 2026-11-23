import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { Cell, ImportSource } from '@/features/measurements/types'
import { isNonEmpty, MAX_RECORDS, validateFile } from './validation'

export function parseFile(buffer: ArrayBuffer, fileName: string): ImportSource {
  validateFile({ name: fileName, size: buffer.byteLength })
  if (/\.csv$/i.test(fileName)) {
    let content = new TextDecoder('utf-8').decode(buffer)
    if (content.includes('\ufffd')) content = new TextDecoder('windows-1252').decode(buffer)
    if (content.includes('\0')) throw new Error('O conteúdo não parece ser um arquivo CSV de texto.')
    const parsed = Papa.parse<string[]>(content.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy', dynamicTyping: false })
    const fatal = parsed.errors.filter(error => error.code !== 'UndetectableDelimiter')
    if (fatal.length) throw new Error(`CSV inválido: ${fatal[0].message}`)
    if (!parsed.data.length || parsed.data.every(row => row.length < 2)) throw new Error('Nenhuma tabela encontrada. Confira o delimitador e as colunas do CSV.')
    if (parsed.data.length > MAX_RECORDS + 101) throw new Error('O arquivo excede 250 mil registros, além das linhas de cabeçalho permitidas.')
    return { fileName, sheets: [{ name: 'CSV', rows: parsed.data, date1904: false }] }
  }
  const bytes = new Uint8Array(buffer)
  const validSignature = /\.xlsx$/i.test(fileName)
    ? bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
    : [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((byte, index) => bytes[index] === byte)
  if (!validSignature) throw new Error('O conteúdo não corresponde ao formato Excel escolhido. Salve novamente como XLSX ou XLS binário.')
  try {
    // Keep numbers and cached formula values; never evaluate formulas or macros.
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, sheetRows: MAX_RECORDS + 102 })
    const sheets = workbook.SheetNames.map(name => {
      const sheet = workbook.Sheets[name]
      const range = XLSX.utils.decode_range(sheet['!fullref'] ?? sheet['!ref'] ?? 'A1')
      if (range.e.r + 1 > MAX_RECORDS + 100) throw new Error('Uma aba excede o limite de 250.100 linhas físicas, incluindo cabeçalho e linhas vazias.')
      const rows = XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, raw: true, defval: null, blankrows: true, range: 0 })
      return { name, rows, date1904: Boolean(workbook.Workbook?.WBProps?.date1904) }
    }).filter(sheet => sheet.rows.some(isNonEmpty))
    if (!sheets.length) throw new Error('A planilha não contém abas com dados.')
    return { fileName, sheets }
  } catch (error) {
    throw new Error(`Não foi possível ler a planilha. ${error instanceof Error ? error.message : 'O arquivo pode estar corrompido ou protegido.'}`)
  }
}
