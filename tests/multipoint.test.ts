import { describe, expect, it } from 'vitest'
import { parseFile } from '../src/features/file-import/parser'
import { discoverPoints, normalizePoints } from '../src/features/file-import/points'
import { multipointWorkbook } from './multipoint-fixture'

describe('planilhas com vários pontos e durações variáveis', () => {
  it('detecta IDs e associa localização, sem depender da ordem ou da duração', () => {
    const source = parseFile(multipointWorkbook(), 'exemplo.xlsx')
    const sheet = source.sheets[0]
    const points = discoverPoints(sheet)
    expect(points.map(point => point.id)).toEqual(['Receptor A', 'P20', 'Fundo'])
    expect(points[0].info).toMatchObject({ address: 'Rua sintética do Receptor A', enterprise: 'Empreendimento sintético' })
    sheet.points = points
    const data = normalizePoints(source.fileName, sheet, { timezone: 'America/Recife', unit: 'dB(A)' })
    expect(data.map(item => item.validRecords)).toEqual([60, 180, 30])
    expect(data.map(item => item.invalidRecords)).toEqual([0, 0, 0])
    expect(data[0].measurements.at(-1)?.timestamp).toBe(60_000)
    expect(data[1].measurements.at(-1)?.timestamp).toBe(180_000)
    expect(data[0].timeBasis).toBe('elapsed')
    expect(data[0].unit).toBe('dB')
  })
  it('aceita mais de dez pontos e um único ponto', () => {
    for (const count of [1, 14]) {
      const ids = Array.from({ length: count }, (_, index) => `Local ${index + 1}`)
      const sheet = parseFile(multipointWorkbook(ids, ids.map(() => 5)), 'locais.xlsx').sheets[0]
      expect(discoverPoints(sheet)).toHaveLength(count)
    }
  })
  it('rejeita identificações duplicadas em vez de misturar séries', () => {
    const sheet = parseFile(multipointWorkbook(['A', ' a '], [5, 5]), 'duplicado.xlsx').sheets[0]
    expect(() => discoverPoints(sheet)).toThrow(/repetido|dois blocos/)
  })
  it('preserva offsets físicos de colunas, células mescladas e lacunas', () => {
    const sheet = parseFile(multipointWorkbook(['X'], [180]), 'deslocado.xlsx').sheets[0]
    sheet.rows[20][6] = null; sheet.rows[20][7] = null
    const data = normalizePoints('deslocado.xlsx', sheet, { timezone: 'UTC', unit: 'dB' })[0]
    expect(data.mapping.dateColumn).toBe(6)
    expect(data.validRecords).toBe(179)
    expect(data.measurements.at(-1)?.timestamp).toBe(180_000)
  })
})
