// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { chartOption } from '../src/features/charts/options'
import { reportFormats, reportOption, type ReportFormat } from '../src/features/charts/report'
import { reportSvg } from '../src/features/charts/export'
import { dataset } from './helpers'
import { chartDetails } from '../src/features/charts/details'

describe('figura e escalas temporais', () => {
  it('posiciona referências nas leituras reais e recalcula Leq ao filtrar', () => {
    const data = dataset()
    data.measurements = [50, 60, 70].map((value, index) => ({ timestamp: (index + 1) * 1000, value }))
    const full = chartDetails(data, { start: 1000, end: 3000 }, false, false)
    expect(full.markPoint?.data).toMatchObject([{ coord: [3000, 70] }, { coord: [1000, 50] }])
    expect(full.markLine?.data).toMatchObject([{ yAxis: expect.closeTo(65.68201724066995, 8) }])
    const filtered = chartDetails(data, { start: 2000, end: 3000 }, false, false)
    expect(filtered.markLine?.data).toMatchObject([{ yAxis: expect.closeTo(67.40362689494243, 8) }])
    const original = data.measurements.map(point => ({ ...point }))
    chartOption(data, { start: 1000, end: 3000 }, 'Exemplo')
    expect(data.measurements).toEqual(original)
  })
  it('não desenha referência de Leq indisponível, mesmo em um recorte regular', () => {
    const data = dataset()
    data.measurements = [1000, 2000, 5000].map((timestamp, index) => ({ timestamp, value: 50 + index * 10 }))
    const { option } = reportOption(data, { title: 'Irregular', range: { start: 1000, end: 2000 } })
    const series = option.series as { markLine: { data: unknown[] } }[]
    expect(series[0].markLine.data).toEqual([])
  })
  it('mantém todas as amostras e adapta o eixo numérico às durações', () => {
    const data = dataset()
    data.timeBasis = 'elapsed'
    for (const duration of [60, 180]) {
      data.measurements = Array.from({ length: duration }, (_, index) => ({ timestamp: (index + 1) * 1000, value: 50 + index % 10 }))
      const option = chartOption(data, { start: 1000, end: duration * 1000 }, 'Ponto')
      expect(option.xAxis).toMatchObject({ type: 'value', min: 1000, max: duration * 1000, name: 'Tempo decorrido (s)' })
      expect((option.series as { data: unknown[] }[])[0].data).toHaveLength(duration)
    }
  })
  it('fixa a escala em decibéis e mantém as leituras fora dos limites nos indicadores', () => {
    const data = dataset()
    data.measurements = [-5, 60, 115].map((value, index) => ({ timestamp: (index + 1) * 1000, value }))
    const view = { title: 'Monitoramento', range: { start: 1000, end: 3000 } }
    expect(chartOption(data, view.range, view.title).yAxis).toMatchObject({ min: 0, max: 110 })
    const svg = reportSvg(data, view)
    for (const label of ['>0</text>', '>110</text>', '-5,0 dB', '115,0 dB', 'Há medições fora da escala de 0 a 110 dB']) expect(svg).toContain(label)
    data.unit = 'Pa'
    expect(chartOption(data, view.range, view.title).yAxis).not.toHaveProperty('max')
  })
  it('exporta identificação, indicadores e hipótese sem inventar datas ou executar texto', () => {
    const data = dataset()
    data.timeBasis = data.mapping.timeBasis = 'elapsed'
    data.mapping.weighting = 'unknown'
    data.point = { id: 'Ponto sul' }
    data.measurements = [50, 60, 70].map((value, index) => ({ timestamp: (index + 1) * 1000, value }))
    const view = { title: 'Monitoramento', range: { start: 1000, end: 3000 }, report: { address: '</text><script>alert(1)</script>', enterprise: 'Exemplo sintético' } }
    const result = reportOption(data, view)
    expect(result).toMatchObject({ width: 960, height: 1080 })
    const svg = reportSvg(data, view)
    for (const label of ['Ponto sul', 'Exemplo sintético', 'Média aritmética', 'Leq estimado', '65,7 dB', 'instantâneas', 'Tempo decorrido']) expect(svg).toContain(label)
    expect(svg).not.toContain('<script>')
    expect(svg).not.toContain('1900')
    expect(svg).not.toContain('dB(A)')
    expect(reportSvg(data, { ...view, range: { start: 2000, end: 3000 } })).not.toContain('65,7 dB')
  })
  it('mantém a proporção e espaço para a curva com os campos de identificação longos', () => {
    const data = dataset()
    const field = 'Medição '.repeat(25).trim()
    const view = { title: 'Monitoramento '.repeat(7).trim(), range: { start: data.measurements[0].timestamp, end: data.measurements.at(-1)!.timestamp }, report: {
      enterprise: field, address: 'Endereço '.repeat(55).trim(), east: field, north: field, datum: field, zone: field, hemisphere: field,
    } }
    for (const aspect of Object.keys(reportFormats) as ReportFormat[]) {
      const expected = reportFormats[aspect]
      const { width, height, option } = reportOption(data, view, aspect)
      const grid = option.grid as { top: number; bottom: number }
      expect(width).toBe(expected.width)
      expect(height).toBe(expected.height)
      expect(height - grid.top - grid.bottom).toBeGreaterThan(230)
      const svg = reportSvg(data, view, aspect)
      expect(svg).toContain('Identificação abreviada para caber na figura.')
      for (const label of ['Empreendimento', 'Endereço', 'Coordenadas', 'Período']) expect(svg).toContain(label)
    }
  })
})
