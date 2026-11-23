import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import { normalizeSheet, parseTimestamp, parseValue, suggestMapping } from '../src/features/file-import/normalize'
import { mapping } from './helpers'

describe('normalização dos valores', () => {
  it('preserva zero, negativos e números Excel; respeita o separador escolhido', () => {
    expect(parseValue('0', ',')).toBe(0)
    expect(parseValue('-1,25', ',')).toBe(-1.25)
    expect(parseValue(65.4, ',')).toBe(65.4)
    expect(parseValue('65.4', '.')).toBe(65.4)
    for (const cell of ['', null, '1.234,5', '65.4', true, 'NaN', Infinity]) expect(() => parseValue(cell, ',')).toThrow()
  })
})

describe('datas e fusos', () => {
  it('interpreta datas brasileiras e milissegundos no fuso explícito', () => {
    const actual = parseTimestamp('23/11/2026 12:30:45.123', null, mapping(), false)
    expect(actual).toBe(Date.UTC(2026, 10, 23, 15, 30, 45, 123))
  })
  it('combina data/hora separadas e frações Excel', () => {
    expect(parseTimestamp('23/11/2026', '12:30:00', mapping({ timeColumn: 2 }), false)).toBe(Date.UTC(2026, 10, 23, 15, 30))
    expect(parseTimestamp(61, 0.5, mapping({ timeColumn: 2, timezone: 'UTC' }), false)).toBe(Date.UTC(1900, 2, 1, 12))
    expect(parseTimestamp(0.5, null, mapping({ timezone: 'UTC' }), true)).toBe(Date.UTC(1904, 0, 1, 12))
    expect(parseTimestamp('61,5', null, mapping({ dateFormat: 'excel', timezone: 'UTC' }), false)).toBe(Date.UTC(1900, 2, 1, 12))
  })
  it('rejeita serial fictício, data impossível, excesso de horas e data vazia', () => {
    for (const value of [60, '31/02/2026', '23/11/2026 25:00', '']) expect(() => parseTimestamp(value, null, mapping(), false)).toThrow()
    expect(() => parseTimestamp('23/11/2026', 1, mapping({ timeColumn: 2 }), false)).toThrow()
  })
  it('interpreta ISO sem offset no fuso escolhido e respeita offsets explícitos', () => {
    expect(parseTimestamp('2026-11-23 12:00', null, mapping({ dateFormat: 'iso' }), false)).toBe(Date.UTC(2026, 10, 23, 15))
    expect(parseTimestamp('2026-11-23T12:00:00+02:00', null, mapping(), false)).toBe(Date.UTC(2026, 10, 23, 10))
    expect(parseTimestamp('2026-11-23T12:00:00Z', null, mapping(), false)).toBe(Date.UTC(2026, 10, 23, 12))
  })
  it('rejeita horários inexistentes e ambíguos em mudanças de horário de verão', () => {
    const settings = mapping({ timezone: 'America/New_York', dateFormat: 'iso' })
    expect(() => parseTimestamp('2026-03-08 02:30:00', null, settings, false)).toThrow(/inexistente/)
    expect(() => parseTimestamp('2026-11-01 01:30:00', null, settings, false)).toThrow(/ambíguo/)
    expect(parseTimestamp('2026-11-01T01:30:00-04:00', null, settings, false)).toBe(Date.UTC(2026, 10, 1, 5, 30))
  })
  it('exige data de referência para horários isolados', () => {
    expect(() => parseTimestamp('12:30', null, mapping({ timeOnly: true }), false)).toThrow(/referência/)
    expect(parseTimestamp('12:30', null, mapping({ timeOnly: true, referenceDate: '2026-11-23' }), false)).toBe(Date.UTC(2026, 10, 23, 15, 30))
  })
  it('não depende do fuso da máquina', () => {
    const instant = parseTimestamp('23/11/2026 12:00', null, mapping(), false)
    expect(DateTime.fromMillis(instant, { zone: 'Asia/Tokyo' }).toISO()).toBe('2026-11-24T00:00:00.000+09:00')
  })
})

describe('conjunto de medições', () => {
  it('ignora linhas vazias, informa inválidos, ordena e preserva duplicados e intervalos irregulares', () => {
    const result = normalizeSheet('teste.csv', { name: 'CSV', date1904: false, rows: [
      ['Data', 'Nível'], ['23/11/2026 12:00:02', '62,5'], [null, ''],
      ['23/11/2026 12:00:00', '0'], ['23/11/2026 12:00:00', '60'],
      ['23/11/2026 12:03:00', '70'], ['31/02/2026', '50'], ['23/11/2026', ''],
    ] }, mapping())
    expect(result.totalRecords).toBe(6)
    expect(result.validRecords).toBe(4)
    expect(result.invalidRecords).toBe(2)
    expect(result.duplicateTimestamps).toBe(1)
    expect(result.measurements.map(point => point.value)).toEqual([0, 60, 62.5, 70])
    expect(result.measurements[3].timestamp - result.measurements[2].timestamp).toBe(178_000)
    expect(result.invalidPreview.map(record => record.row)).toEqual([7, 8])
  })
  it('valida fuso, cabeçalho, unidade e colunas distintas', () => {
    const sheet = { name: 'CSV', date1904: false, rows: [['Data', 'Nível'], ['23/11/2026', '50']] }
    for (const settings of [{ timezone: 'invalido' }, { dateColumn: 1 }, { headerRow: 99 }, { unit: '' }, { valueColumn: -1 }]) expect(() => normalizeSheet('x.csv', sheet, mapping(settings))).toThrow()
  })
  it('sugere cabeçalho deslocado e não escolhe uma coluna sonora ambígua', () => {
    const result = suggestMapping({ name: 'CSV', date1904: false, rows: [['Equipamento X'], ['Data', 'Hora', 'LAeq', 'SPL'], ['23/11/2026', '12:00', '60,5', '61,5']] })
    expect(result.headerRow).toBe(1)
    expect(result.dateColumn).toBe(0)
    expect(result.timeColumn).toBe(1)
    expect(result.valueColumn).toBe(-1)
  })
  it('limita os diagnósticos sem perder contagens', () => {
    const result = normalizeSheet('x.csv', { name: 'CSV', date1904: false, rows: [['Data', 'Nível'], ...Array.from({ length: 120 }, () => ['inválida', '50'])] }, mapping())
    expect(result.invalidRecords).toBe(120)
    expect(result.invalidPreview).toHaveLength(100)
    expect(result.preview).toHaveLength(10)
  })
})
