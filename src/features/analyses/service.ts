import type { User } from 'firebase/auth'
import { api } from '@/lib/api'
import type { MeasurementDataset } from '@/features/measurements/types'
import { CHUNK_SIZE, metadataFromDataset, type ChartView, type PointTuple, type StoredAnalysis } from '../../../shared/persistence'

async function batches(total: number, run: (index: number) => Promise<void>) {
  for (let start = 0; start < total; start += 3) await Promise.all(Array.from({ length: Math.min(3, total - start) }, (_, offset) => run(start + offset)))
}

export async function saveAnalysis(user: User, dataset: MeasurementDataset, view: ChartView, id: string, existing: boolean, signal: AbortSignal, progress: (count: number) => void) {
  const baseName = view.title === 'Série temporal de nível sonoro' ? dataset.fileName.replace(/\.[^.]+$/, '').slice(0, 100) : view.title
  const name = (dataset.point ? `${dataset.point.id} — ${baseName}` : baseName).slice(0, 100)
  const chart = { ...view, title: view.title.trim() || 'Série temporal de nível sonoro' }
  if (!existing) {
    const started = await api<{ state: string }>(user, 'analyses', { method: 'POST', signal, body: JSON.stringify({ id, name: name.trim() || chart.title, metadata: metadataFromDataset(dataset), chart }) })
    if (started.state === 'uploading') {
      let completed = 0
      await batches(Math.ceil(dataset.validRecords / CHUNK_SIZE), async index => {
        signal.throwIfAborted()
        const points = dataset.measurements.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE).map(point => [point.timestamp, point.value])
        await api(user, `analyses/${id}/chunks/${index}`, { method: 'PUT', signal, body: JSON.stringify({ points }) })
        completed += points.length
        if (!signal.aborted) progress(completed)
      })
      await api(user, `analyses/${id}/complete`, { method: 'POST', signal })
    }
  }
  return api<StoredAnalysis>(user, `analyses/${id}`, { method: 'PATCH', signal, body: JSON.stringify({ name: name.trim() || chart.title, chart }) })
}

export async function loadAnalysis(user: User, id: string, signal: AbortSignal): Promise<{ stored: StoredAnalysis; dataset: MeasurementDataset }> {
  const stored = await api<StoredAnalysis>(user, `analyses/${id}`, { signal })
  const chunks: PointTuple[][] = []
  await batches(stored.chunkCount, async index => {
    signal.throwIfAborted()
    const result = await api<{ points: PointTuple[] }>(user, `analyses/${id}/chunks/${index}`, { signal })
    chunks[index] = result.points
  })
  const measurements = chunks.flatMap(points => points.map(([timestamp, value]) => ({ timestamp, value })))
  if (measurements.length !== stored.metadata.validRecords) throw new Error('A análise recebida está incompleta. Tente abrir novamente.')
  return { stored, dataset: {
    ...stored.metadata, measurements,
    preview: measurements.slice(0, 10).map((point, index) => ({ ...point, row: index + 1, original: [] })),
    invalidPreview: stored.metadata.invalidPreview.map(record => ({ ...record, original: [] })),
  } }
}
