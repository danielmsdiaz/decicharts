import type { User } from 'firebase/auth'
import { api, ApiError } from '@/lib/api'
import type { MeasurementDataset } from '@/features/measurements/types'
import { CHUNK_SIZE, MAX_POINTS, metadataFromDataset, type ChartView, type ImportSummary, type ImportPointPage, type PointTuple, type SaveReceipt, type LoadedImport } from '../../../shared/persistence'

export interface SaveProgress { points: number; totalPoints: number; records: number; totalRecords: number; publishing: boolean }
export interface SaveSnapshot {
  id: string; saveId: string; baseVersion: number; name: string
  points: { id: string; dataset: MeasurementDataset; view: ChartView; ordinal: number }[]
}
// One limiter for the whole import, never three workers per point. Settle the
// current batch before throwing, so retry cannot race a previous batch.
async function batches(total: number, signal: AbortSignal, run: (index: number) => Promise<void>) {
  for (let start = 0; start < total; start += 3) {
    signal.throwIfAborted()
    const results = await Promise.allSettled(Array.from({ length: Math.min(3, total - start) }, (_, offset) => run(start + offset)))
    const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (failed) throw failed.reason
  }
}
export async function saveImport(user: User, snapshot: SaveSnapshot, signal: AbortSignal, progress: (value: SaveProgress) => void): Promise<ImportSummary> {
  const { points, id, saveId, baseVersion, name } = snapshot
  const totalRecords = points.reduce((sum, point) => sum + point.dataset.validRecords, 0)
  if (!points.length || totalRecords > MAX_POINTS || points.some(point => !point.dataset.validRecords)) throw new Error('Corrija todos os pontos antes de salvar a importação.')
  const first = points[0].dataset
  const input = { id, name, fileName: first.fileName, sheetName: first.sheetName, pointCount: points.length, recordCount: totalRecords }
  const prefix = `imports/${id}/saves/${saveId}`
  const send = <T,>(path: string, method: string, value?: unknown) => api<T>(user, path, { method, signal, ...(value === undefined ? {} : { body: JSON.stringify(value) }) })
  if (baseVersion === 0) await send('imports', 'POST', input)
  const started = await send<SaveReceipt>(`imports/${id}/saves`, 'POST', { id: saveId, name, baseVersion })
  const state: SaveProgress = { points: 0, totalPoints: points.length, records: 0, totalRecords, publishing: false }
  let result = started
  if (started.state !== 'committed') {
    const ready: boolean[] = []
    await batches(points.length, signal, async index => {
      const point = points[index]
      const received = await send<{ ready: boolean }>(`${prefix}/points/${point.id}`, 'PUT', {
        ordinal: point.ordinal, chart: point.view, ...(baseVersion === 0 ? { metadata: metadataFromDataset(point.dataset) } : {}),
      })
      ready[index] = received.ready
      if (received.ready) { state.records += point.dataset.validRecords; state.points++ }
      progress({ ...state })
    })
    const jobs = points.flatMap((point, index) => ready[index] ? [] : Array.from({ length: Math.ceil(point.dataset.validRecords / CHUNK_SIZE) }, (_, chunkIndex) => ({ point, chunkIndex })))
    const remaining = new Map(points.map(point => [point.id, Math.ceil(point.dataset.validRecords / CHUNK_SIZE)]))
    await batches(jobs.length, signal, async index => {
      const { point, chunkIndex } = jobs[index]
      const values = point.dataset.measurements.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE).map(value => [value.timestamp, value.value])
      await send(`${prefix}/points/${point.id}/chunks/${chunkIndex}`, 'PUT', { points: values })
      state.records += values.length; progress({ ...state })
      remaining.set(point.id, remaining.get(point.id)! - 1)
      if (remaining.get(point.id) === 0) {
        await send(`${prefix}/points/${point.id}/complete`, 'POST')
        state.points++; progress({ ...state })
      }
    })
    progress({ ...state, publishing: true })
    result = await send<SaveReceipt>(`${prefix}/complete`, 'POST')
  }
  if (result.state !== 'committed' || result.version !== baseVersion + 1) throw new Error('A confirmação do conjunto está incompleta. Tente salvar novamente.')
  return { ...input, version: result.version, saveId, updatedAt: result.updatedAt ?? new Date().toISOString() }
}

async function loadVersion(user: User, id: string, signal: AbortSignal): Promise<LoadedImport> {
  const summary = await api<ImportSummary>(user, `imports/${id}`, { signal })
  if (!summary.saveId || summary.pointCount < 1 || summary.recordCount > MAX_POINTS) throw new Error('A análise recebida está incompleta.')
  const stored: ImportPointPage['points'] = []
  let offset: number | null = 0
  do {
    const page: ImportPointPage = await api(user, `imports/${id}/points?saveId=${summary.saveId}&offset=${offset}`, { signal })
    if (!page.points.length || (page.nextOffset !== null && page.nextOffset <= offset) || stored.length + page.points.length > summary.pointCount) throw new Error('A lista de pontos recebida está incompleta.')
    stored.push(...page.points); offset = page.nextOffset
  } while (offset !== null)
  if (stored.length !== summary.pointCount || new Set(stored.map(point => point.id)).size !== stored.length
    || stored.some((point, index) => point.ordinal !== index || point.chunkCount !== Math.ceil(point.metadata.validRecords / CHUNK_SIZE))
    || stored.reduce((sum, point) => sum + point.metadata.validRecords, 0) !== summary.recordCount) throw new Error('Os pontos não correspondem à importação salva.')
  const payloads: PointTuple[][][] = stored.map(() => [])
  const jobs = stored.flatMap((point, ordinal) => Array.from({ length: point.chunkCount }, (_, index) => ({ point, ordinal, index })))
  await batches(jobs.length, signal, async index => {
    const job = jobs[index]
    const response = await api<{ points: PointTuple[] }>(user, `imports/${id}/points/${job.point.id}/chunks/${job.index}`, { signal })
    payloads[job.ordinal][job.index] = response.points
  })
  const points = stored.map((point, ordinal) => {
    const values = payloads[ordinal].flat()
    if (values.length !== point.metadata.validRecords || values.some(([timestamp, value], index) => !Number.isSafeInteger(timestamp) || !Number.isFinite(value)
      || (index > 0 && timestamp < values[index - 1][0]) || (point.metadata.timeBasis === 'elapsed' && timestamp < 0))
      || !values.length || point.chart.range.start < values[0][0] || point.chart.range.end > values.at(-1)![0]) throw new Error('As medições recebidas estão incompletas ou inválidas.')
    const measurements = values.map(([timestamp, value]) => ({ timestamp, value }))
    return { stored: point, dataset: { ...point.metadata, measurements,
      preview: measurements.slice(0, 10).map((value, index) => ({ ...value, row: index + 1, original: [] })),
      invalidPreview: point.metadata.invalidPreview.map(value => ({ ...value, original: [] })),
    } }
  })
  const latest = await api<ImportSummary>(user, `imports/${id}`, { signal })
  if (latest.version !== summary.version || latest.saveId !== summary.saveId) throw new ApiError(409, 'A análise mudou durante a leitura. Abra novamente.')
  return { summary, points }
}
export async function loadImport(user: User, id: string, signal: AbortSignal): Promise<LoadedImport> {
  try { return await loadVersion(user, id, signal) }
  catch (issue) {
    if (!(issue instanceof ApiError) || issue.status !== 409 || signal.aborted) throw issue
    return loadVersion(user, id, signal)
  }
}
