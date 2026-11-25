import { describe, expect, it } from 'vitest'
import { indicators } from '../src/features/measurements/indicators'
import { elapsedMilliseconds, formatCoordinate, levelUnit } from '../src/features/measurements/temporal'
import { metadata, chartView } from '../server/validation'
import { metadataFromDataset } from '../shared/persistence'
import { dataset } from './helpers'

describe('tempo relativo e indicadores energéticos', () => {
  it('representa segundos, incluindo o segundo 60, sem datas fictícias', () => {
    expect(elapsedMilliseconds('60')).toBe(60_000)
    expect(elapsedMilliseconds('0,125')).toBe(125)
    expect(formatCoordinate(180_000, 'elapsed', 'America/Recife')).toBe('180 s')
    expect(() => elapsedMilliseconds('0.0001')).toThrow(/milissegundo/)
    expect(() => elapsedMilliseconds('-1')).toThrow()
  })
  it('calcula energia em vez da média aritmética e evita overflow', () => {
    const data = dataset()
    data.measurements = [50, 60, 70].map((value, index) => ({ timestamp: index * 1000, value }))
    const result = indicators(data, data.measurements)!
    expect(result.mean).toBeCloseTo(60)
    expect(result.leq).toBeCloseTo(65.6820172407)
    data.measurements = data.measurements.map(p => ({ ...p, value: 4000 }))
    expect(indicators(data, data.measurements)?.leq).toBe(4000)
  })
  it('não inventa duração para lacunas, duplicados, inválidos ou leitura isolada', () => {
    const data = dataset()
    data.measurements[2].timestamp += 1000
    expect(indicators(data, data.measurements)?.leq).toBeNull()
    data.duplicateTimestamps = 1
    expect(indicators(data, data.measurements)?.reason).toMatch(/repetidos/)
    data.invalidRecords = 1
    expect(indicators(data, data.measurements)?.reason).toMatch(/inválidos/)
    data.invalidRecords = data.duplicateTimestamps = 0
    expect(indicators(data, [data.measurements[0]])?.leq).toBeNull()
  })
  it('não infere ponderação A da preferência da conta', () => {
    const data = dataset()
    expect(levelUnit(data)).toBe('dB')
    data.mapping.weighting = 'A'
    expect(levelUnit(data)).toBe('dB(A)')
  })
  it('valida metadados v2 e mantém a leitura de contratos legados', () => {
    const data = dataset()
    data.timeBasis = data.mapping.timeBasis = 'elapsed'
    data.point = { id: 'Receptor norte', address: 'Endereço sintético' }
    const value = metadataFromDataset(data)
    expect(metadata(value)).toMatchObject({ schemaVersion: 2, timeBasis: 'elapsed', point: data.point })
    expect(() => metadata({ ...value, schemaVersion: 3 })).toThrow()
    expect(() => metadata({ ...value, timeBasis: 'absolute' })).toThrow()
    const { schemaVersion, timeBasis, sourceKind, point, ...legacy } = value
    void schemaVersion; void timeBasis; void sourceKind; void point
    legacy.mapping = { ...legacy.mapping, timeBasis: undefined }
    expect(metadata(legacy)).not.toHaveProperty('schemaVersion')
    expect(chartView({ title: 'Título', range: { start: 0, end: 1000 }, report: { address: 'Rua de teste' } })).toMatchObject({ report: { address: 'Rua de teste' } })
    expect(() => chartView({ title: 'Título', range: { start: 0, end: 1000 }, report: { logo: 'https://example.com/logo.svg' } })).toThrow()
  })
})
