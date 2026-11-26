import type { ImportInput, ImportSummary, SaveInput, ChartView, DatasetMetadata, PointTuple } from '../../shared/persistence'
import * as validate from '../../server/validation'
import { HttpError } from '../../server/errors'

interface Point { id: string; ordinal: number; metadata: DatasetMetadata; chunks: Record<number, PointTuple[]>; ready: boolean }
interface Save { input: SaveInput; charts: Map<string, ChartView>; committed: number | null }
interface Root { input: ImportInput; points: Map<string, Point>; saves: Map<string, Save>; active: string | null; version: number; name: string; updatedAt: string }
export function mockImportRoutes() {
  const roots = new Map<string, Root>()
  const summary = (root: Root): ImportSummary => ({ ...root.input, name: root.name, version: root.version, saveId: root.active, updatedAt: root.updatedAt })
  return (parts: string[], method: string, data: unknown, url: URL): { body: unknown; status?: number } => {
    if (parts.length === 1) {
      if (method === 'GET') {
        const ready = [...roots.values()].filter(root => root.active).map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
        const offset = validate.pageOffset(url.searchParams.get('offset'))
        return { body: { imports: ready.slice(offset, offset + 20), total: ready.length, hasMore: offset + 20 < ready.length } }
      }
      const input = validate.importInput(data)
      if (!roots.has(input.id)) roots.set(input.id, { input, points: new Map(), saves: new Map(), active: null, version: 0, name: input.name, updatedAt: new Date().toISOString() })
      return { body: summary(roots.get(input.id)!), status: 201 }
    }
    const root = roots.get(parts[1])
    if (!root) throw new HttpError(404, 'Análise não encontrada.')
    if (parts.length === 2) {
      if (method === 'DELETE') { roots.delete(parts[1]); return { body: { deleted: true } } }
      if (!root.active) throw new HttpError(404, 'Análise ainda não publicada.')
      return { body: summary(root) }
    }
    if (parts[2] === 'points') {
      if (parts.length === 3) {
        const save = root.saves.get(String(url.searchParams.get('saveId')))
        if (!root.active || !save?.committed) throw new HttpError(409, 'A versão não está publicada.')
        const offset = validate.pageOffset(url.searchParams.get('offset'))
        const values = [...root.points.values()].sort((a, b) => a.ordinal - b.ordinal)
        return { body: { points: values.slice(offset, offset + 2).map(point => ({ id: point.id, ordinal: point.ordinal, metadata: point.metadata, chart: save.charts.get(point.id), chunkCount: Math.ceil(point.metadata.validRecords / 5000) })), nextOffset: offset + 2 < values.length ? offset + 2 : null } }
      }
      if (!root.active) throw new HttpError(404, 'Análise ainda não publicada.')
      const point = root.points.get(parts[3])
      if (!point?.ready || !point.chunks[Number(parts[5])]) throw new HttpError(404, 'Bloco não encontrado.')
      return { body: { points: point.chunks[Number(parts[5])] } }
    }
    if (parts[2] === 'saves' && parts.length === 3) {
      const input = validate.saveInput(data)
      const old = root.saves.get(input.id)
      if (!old && input.baseVersion !== root.version) throw new HttpError(409, 'A análise foi alterada em outra sessão.')
      if (!old) root.saves.set(input.id, { input, charts: new Map(), committed: null })
      const save = root.saves.get(input.id)!
      return { body: { id: input.id, state: save.committed ? 'committed' : 'uploading', version: save.committed, updatedAt: root.updatedAt }, status: 201 }
    }
    const save = root.saves.get(parts[3])
    if (!save) throw new HttpError(404, 'Tentativa não encontrada.')
    if (parts[4] === 'complete') {
      if (!save.committed) {
        if (save.input.baseVersion !== root.version) throw new HttpError(409, 'A análise foi alterada em outra sessão.')
        if (root.points.size !== root.input.pointCount || save.charts.size !== root.input.pointCount || [...root.points.values()].some(point => !point.ready)) throw new HttpError(409, 'Faltam pontos.')
        root.version++; root.active = parts[3]; root.name = save.input.name; save.committed = root.version; root.updatedAt = new Date().toISOString()
      }
      return { body: { id: parts[3], state: 'committed', version: save.committed, updatedAt: root.updatedAt } }
    }
    if (save.committed || save.input.baseVersion !== root.version) throw new HttpError(409, 'A análise foi alterada em outra sessão.')
    const pointId = parts[5]
    if (parts.length === 6) {
      const input = validate.importPoint(data)
      if (!root.points.has(pointId)) {
        if (!input.metadata) throw new HttpError(400, 'Faltam metadados.')
        root.points.set(pointId, { id: pointId, ordinal: input.ordinal, metadata: input.metadata, ready: false, chunks: {} })
      }
      save.charts.set(pointId, input.chart)
      return { body: { ready: root.points.get(pointId)!.ready } }
    }
    const point = root.points.get(pointId)
    if (!point) throw new HttpError(404, 'Ponto não encontrado.')
    if (parts[6] === 'chunks') {
      const value = validate.chunk(validate.object(data).points)
      point.chunks[Number(parts[7])] = value.points
      return { body: { stored: true } }
    }
    if (parts[6] === 'complete') {
      if (Object.values(point.chunks).flat().length !== point.metadata.validRecords) throw new HttpError(409, 'Ponto incompleto.')
      point.ready = true
      return { body: { ready: true } }
    }
    throw new HttpError(404, 'Endpoint inexistente.')
  }
}
