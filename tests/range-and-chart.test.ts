import { describe, expect, it } from 'vitest'
import { chartOption } from '../src/features/charts/options'
import { fullRange, parseFilter, selectMeasurements, summarize } from '../src/features/measurements/range'
import { dataset } from './helpers'

describe('intervalos e indicadores', () => {
  const series = dataset()
  it('inclui ambos os limites sem agregar duplicados', () => {
    const points = [...series.measurements, { ...series.measurements[1], value: 63 }].sort((a, b) => a.timestamp - b.timestamp)
    const selected = selectMeasurements(points, { start: points[1].timestamp, end: points[1].timestamp })
    expect(summarize(selected)).toEqual({ count: 2, min: 60, max: 63, start: points[1].timestamp, end: points[1].timestamp })
    expect(fullRange(points)).toEqual({ start: points[0].timestamp, end: points[3].timestamp })
  })
  it('trata conjunto vazio', () => {
    expect(fullRange([])).toBeNull()
    expect(summarize([])).toBeNull()
  })
  it('interpreta filtros com milissegundos e rejeita horários inválidos', () => {
    expect(parseFilter('2026-11-23T12:00:00.123', 'America/Recife')).toBe(Date.UTC(2026, 10, 23, 15, 0, 0, 123))
    expect(() => parseFilter('2026-03-08T02:30', 'America/New_York')).toThrow()
    expect(() => parseFilter('2026-11-01T01:30', 'America/New_York')).toThrow()
    expect(() => parseFilter('', 'America/Recife')).toThrow()
  })
  it('mantém timestamps e valores reais nas opções, sem suavização ou sampling', () => {
    const options = chartOption(series, fullRange(series.measurements)!, 'Teste')
    expect(options).toMatchObject({ animation: false, xAxis: { type: 'time' }, series: [{ smooth: false, data: series.measurements.map(point => [point.timestamp, point.value]) }] })
    expect((options.series as Record<string, unknown>[])[0]).not.toHaveProperty('sampling')
  })
  it('identifica título, fuso, eixos e limites exatos na exportação', () => {
    const range = { start: series.measurements[0].timestamp + 100, end: series.measurements[2].timestamp - 100 }
    expect(chartOption(series, range, 'Relatório técnico', false, true)).toMatchObject({ backgroundColor: '#ffffff', title: { text: 'Relatório técnico', subtext: expect.stringContaining('America/Recife') }, xAxis: { min: range.start, max: range.end }, yAxis: { name: 'Nível sonoro (dB(A))' } })
  })
  it('exporta um único instante sem expandir o eixo para dias artificiais', () => {
    const instant = series.measurements[0].timestamp
    const options = chartOption(series, { start: instant, end: instant }, 'Instante', false, true)
    expect(options).toMatchObject({ xAxis: { min: instant - 1, max: instant + 1, minInterval: 1, maxInterval: 1 }, dataZoom: [] })
    const axis = options.xAxis as { axisLabel: { formatter: (timestamp: number) => string } }
    expect(axis.axisLabel.formatter(instant - 1)).toBe('')
    expect(axis.axisLabel.formatter(instant)).toContain('00:00:00.000')
  })
})
