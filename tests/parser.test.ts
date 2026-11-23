// @vitest-environment node
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseFile } from '../src/features/file-import/parser'
import { MAX_FILE_BYTES, validateFile } from '../src/features/file-import/validation'
import { normalizeSheet } from '../src/features/file-import/normalize'
import { mapping } from './helpers'

const csv = (text: string) => new TextEncoder().encode(text).buffer
describe('leitura local', () => {
  it('valida extensão, arquivo vazio e limite de tamanho', () => {
    for (const file of [{ name: 'x.pdf', size: 100 }, { name: 'x.csv', size: 0 }, { name: 'x.xlsx', size: MAX_FILE_BYTES + 1 }]) expect(() => validateFile(file)).toThrow()
    expect(() => validateFile({ name: 'MEDICAO.XLS', size: MAX_FILE_BYTES })).not.toThrow()
  })
  it.each([';', ',', '\t'])('detecta delimitador %s e respeita valores entre aspas', delimiter => {
    const source = parseFile(csv(`Data${delimiter}Nível\n23/11/2026${delimiter}"65,4"\n`), 'medicao.csv')
    expect(source.sheets[0].rows[1]).toEqual(['23/11/2026', '65,4'])
    expect(normalizeSheet(source.fileName, source.sheets[0], mapping()).measurements[0].value).toBe(65.4)
  })
  it('remove BOM e suporta texto Windows-1252', () => {
    expect(parseFile(csv('\ufeffData;Nível\n23/11/2026;50'), 'x.csv').sheets[0].rows[0][0]).toBe('Data')
    const data = new Uint8Array([78, 237, 118, 101, 108, 59, 68, 97, 116, 97, 10, 53, 48, 59, 50, 51])
    expect(parseFile(data.buffer, 'x.csv').sheets[0].rows[0][0]).toBe('Nível')
  })
  it.each(['xlsx', 'xls'] as const)('lê %s com abas e mantém números originais', bookType => {
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Data', 'Nível'], [46349.5, 65.4]]), 'Medições')
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Descrição'], ['Equipamento']]), 'Informações')
    const source = parseFile(XLSX.write(book, { type: 'array', bookType }) as ArrayBuffer, `x.${bookType}`)
    expect(source.sheets.map(sheet => sheet.name)).toEqual(['Medições', 'Informações'])
    expect(source.sheets[0].rows[1]).toEqual([46349.5, 65.4])
    expect(normalizeSheet(source.fileName, source.sheets[0], mapping()).validRecords).toBe(1)
  })
  it('lê a configuração de calendário 1904 do workbook', () => {
    const book = XLSX.utils.book_new()
    book.Workbook = { WBProps: { date1904: true } }
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Data', 'Nível'], [0.5, 50]]), 'Medições')
    const source = parseFile(XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer, 'x.xlsx')
    const result = normalizeSheet('x.xlsx', source.sheets[0], mapping({ timezone: 'UTC' }))
    expect(result.measurements[0].timestamp).toBe(Date.UTC(1904, 0, 1, 12))
  })
  it('rejeita conteúdo corrompido ou uma lista sem tabela', () => {
    expect(() => parseFile(csv('arquivo\nsem colunas'), 'x.csv')).toThrow()
    expect(() => parseFile(new Uint8Array([0, 255, 0, 128, 7]).buffer, 'x.xlsx')).toThrow()
    expect(() => parseFile(csv('Data;Nível\n"aspas abertas;50'), 'x.csv')).toThrow()
  })
  it('rejeita 250.001 registros não vazios', () => {
    const rows = [['Data', 'Nível'], ...Array.from({ length: 250_001 }, () => ['23/11/2026', '50'])]
    expect(() => normalizeSheet('x.csv', { name: 'CSV', date1904: false, rows }, mapping())).toThrow(/250 mil/)
  }, 60_000)
})
