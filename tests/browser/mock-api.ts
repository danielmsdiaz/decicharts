import type { Page } from '@playwright/test'
import type { AnalysisSummary, ChartView, DatasetMetadata, PointTuple } from '../../shared/persistence'

interface Draft {
  id: string; name: string; metadata: DatasetMetadata; chart: ChartView
  state: 'uploading' | 'ready'; chunks: Record<number, PointTuple[]>; updatedAt: string
}
function summary(item: Draft): AnalysisSummary {
  const points = Object.keys(item.chunks).map(Number).sort((a, b) => a - b).flatMap(index => item.chunks[index])
  return { id: item.id, name: item.name, fileName: item.metadata.fileName, count: points.length, start: points[0]?.[0] ?? 0, end: points.at(-1)?.[0] ?? 0, unit: item.metadata.unit, timezone: item.metadata.timezone, updatedAt: item.updatedAt, chart: item.chart }
}
export async function mockAccountApi(page: Page) {
  const analyses = new Map<string, Draft>()
  let preferences = { timezone: 'America/Recife', unit: 'dB' }
  await page.route('**/api/**', async route => {
    const request = route.request()
    // Only the test fixture's synthetic token is intercepted. Real authentication
    // and the production API remain unchanged.
    if (request.headers().authorization !== 'Bearer fixture-token') return route.fallback()
    const url = new URL(request.url())
    const parts = url.pathname.replace('/api/', '').split('/')
    const method = request.method()
    const data = request.postData() ? request.postDataJSON() as Record<string, unknown> : {}
    const respond = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (parts[0] === 'profile') {
      if (method === 'PUT') preferences = { timezone: String(data.timezone), unit: String(data.unit) }
      return respond({ uid: 'fixture', name: 'Engenheira de teste', email: 'teste@example.invalid', photoURL: null, preferences })
    }
    if (parts[0] !== 'analyses') return respond({ error: 'Endpoint inexistente.' }, 404)
    if (parts.length === 1) {
      if (method === 'GET') {
        const ready = [...analyses.values()].filter(item => item.state === 'ready').map(summary)
        const offset = Number(url.searchParams.get('offset') ?? 0)
        return respond({ analyses: ready.slice(offset, offset + 20), total: ready.length, hasMore: offset + 20 < ready.length })
      }
      if (method === 'POST') {
        const id = String(data.id)
        if (!analyses.has(id)) analyses.set(id, { id, name: String(data.name), metadata: data.metadata as DatasetMetadata, chart: data.chart as ChartView, state: 'uploading', chunks: {}, updatedAt: new Date().toISOString() })
        return respond({ id, state: analyses.get(id)!.state }, 201)
      }
    }
    const item = analyses.get(parts[1])
    if (!item) return respond({ error: 'Análise não encontrada.' }, 404)
    const stored = () => ({ analysis: summary(item), metadata: item.metadata, chunkCount: Math.ceil(item.metadata.validRecords / 5000) })
    if (parts[2] === 'chunks') {
      const index = Number(parts[3])
      if (method === 'PUT') { item.chunks[index] = data.points as PointTuple[]; return respond({ stored: true }) }
      return respond({ points: item.chunks[index] })
    }
    if (parts[2] === 'complete') { item.state = 'ready'; return respond(stored()) }
    if (method === 'DELETE') { analyses.delete(item.id); return respond({ deleted: true }) }
    if (method === 'PATCH') { item.name = String(data.name); item.chart = data.chart as ChartView; item.updatedAt = new Date().toISOString() }
    return respond(stored())
  })
}
