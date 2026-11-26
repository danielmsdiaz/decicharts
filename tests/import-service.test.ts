// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import type { User } from 'firebase/auth'
import { api } from '../src/lib/api'
import { saveImport, type SaveSnapshot } from '../src/features/analyses/import-service'
import { dataset } from './helpers'
import { MAX_BATCH_BYTES, type ImportBatchInput } from '../shared/persistence'

vi.mock('../src/lib/api', async original => ({ ...await original<typeof import('../src/lib/api')>(), api: vi.fn() }))
const user = {} as User
beforeEach(() => vi.clearAllMocks())
function snapshot(): SaveSnapshot {
  return { id: 'import', saveId: 'attempt', baseVersion: 0, name: 'Dez pontos', points: Array.from({ length: 10 }, (_, ordinal) => {
    const data = dataset()
    return { id: `point-${ordinal}`, ordinal, dataset: data, view: { title: `P${ordinal}`, range: { start: data.measurements[0].timestamp, end: data.measurements.at(-1)!.timestamp } } }
  }) }
}
it('salva dez pontos em três chamadas e atualiza os ajustes em duas, sem reenviar medições', async () => {
  const value = snapshot()
  vi.mocked(api).mockImplementation(async (_, path, options) => {
    if (path.endsWith('/saves')) return { id: value.saveId, state: 'uploading', version: null } as never
    if (path.endsWith('/batch')) {
      const body = JSON.parse(String(options?.body)) as ImportBatchInput
      expect(body.publish).toBe(true)
      expect(body.points).toHaveLength(10)
      expect(body.points.every(point => value.baseVersion === 0 ? point.points?.length === 3 : point.points === undefined)).toBe(true)
      return { points: body.points.map(point => ({ id: point.id, ready: true })), committed: { id: value.saveId, state: 'committed', version: value.baseVersion + 1 } } as never
    }
    return {} as never
  })
  const saved = await saveImport(user, value, new AbortController().signal, vi.fn())
  expect(saved.pointCount).toBe(10)
  expect(vi.mocked(api).mock.calls.map(call => call[1])).toEqual(['imports', 'imports/import/saves', 'imports/import/saves/attempt/batch'])
  vi.mocked(api).mockClear()
  value.baseVersion = 1; value.saveId = 'next'
  await saveImport(user, value, new AbortController().signal, vi.fn())
  expect(vi.mocked(api).mock.calls.map(call => call[1])).toEqual(['imports/import/saves', 'imports/import/saves/next/batch'])
})
it('mantém o fallback em blocos e o limite global de três requisições para séries grandes', async () => {
  const value = snapshot()
  for (const point of value.points) {
    const first = point.dataset.measurements[0].timestamp
    point.dataset.measurements = Array.from({ length: 5001 }, (_, index) => ({ timestamp: first + index * 1000, value: 50 }))
    point.dataset.totalRecords = point.dataset.validRecords = 5001
    point.view.range.end = first + 5000 * 1000
  }
  let active = 0, maximum = 0, chunks = 0, seals = 0
  vi.mocked(api).mockImplementation(async (_, path, options) => {
    active++; maximum = Math.max(maximum, active)
    await new Promise(resolve => setTimeout(resolve, 1)); active--
    if (path.endsWith('/saves')) return { id: value.saveId, state: 'uploading', version: null } as never
    if (path.endsWith('/batch')) {
      const body = JSON.parse(String(options?.body)) as ImportBatchInput
      expect(body.publish).toBe(false); expect(body.points.every(point => point.points === undefined)).toBe(true)
      return { points: body.points.map(point => ({ id: point.id, ready: false })) } as never
    }
    if (path.includes('/chunks/')) chunks++
    if (path.match(/points\/[^/]+\/complete$/)) seals++
    if (path.endsWith(`/${value.saveId}/complete`)) return { id: value.saveId, state: 'committed', version: 1 } as never
    return {} as never
  })
  await saveImport(user, value, new AbortController().signal, vi.fn())
  expect(chunks).toBe(20); expect(seals).toBe(10); expect(maximum).toBe(3)
})
it('divide lotes por bytes UTF-8 quando há logomarcas grandes e publica só depois de todos', async () => {
  const value = snapshot()
  for (const point of value.points) point.view.report = { address: 'á'.repeat(500), logo: 'A'.repeat(170000) }
  let received = 0, maxBody = 0
  vi.mocked(api).mockImplementation(async (_, path, options) => {
    if (path.endsWith('/saves')) return { id: value.saveId, state: 'uploading', version: null } as never
    if (path.endsWith('/batch')) {
      const body = JSON.parse(String(options?.body)) as ImportBatchInput
      maxBody = Math.max(maxBody, new TextEncoder().encode(String(options?.body)).byteLength)
      received += body.points.length; expect(body.publish).toBe(false)
      return { points: body.points.map(point => ({ id: point.id, ready: true })) } as never
    }
    if (path.endsWith('/complete')) { expect(received).toBe(10); return { id: value.saveId, state: 'committed', version: 1 } as never }
    return {} as never
  })
  await saveImport(user, value, new AbortController().signal, vi.fn())
  expect(maxBody).toBeLessThanOrEqual(MAX_BATCH_BYTES)
  expect(vi.mocked(api).mock.calls.filter(call => call[1].endsWith('/batch'))).toHaveLength(5)
  expect(vi.mocked(api).mock.calls.some(call => call[1].includes('/chunks/'))).toBe(false)
})
it('reconhece uma tentativa já publicada após perder a confirmação, sem reenviar pontos', async () => {
  vi.mocked(api).mockResolvedValue({ id: 'attempt', state: 'committed', version: 1 } as never)
  const saved = await saveImport(user, snapshot(), new AbortController().signal, vi.fn())
  expect(saved.version).toBe(1)
  expect(vi.mocked(api).mock.calls.map(call => call[1])).toEqual(['imports', 'imports/import/saves'])
})
it('aguarda envios em andamento após uma falha e não inicia outros lotes antes da nova tentativa', async () => {
  const value = snapshot()
  for (const point of value.points) point.view.report = { logo: 'A'.repeat(170000) }
  let rejectFirst!: (issue: Error) => void, releaseOthers!: () => void, sent = 0, settled = false
  const first = new Promise<never>((_, reject) => { rejectFirst = reject })
  const others = new Promise<void>(resolve => { releaseOthers = resolve })
  vi.mocked(api).mockImplementation(async (_, path, options) => {
    if (path.endsWith('/saves')) return { id: value.saveId, state: 'uploading', version: null } as never
    if (path.endsWith('/batch')) {
      sent++
      if (sent === 1) return await first
      await others
      const body = JSON.parse(String(options?.body)) as ImportBatchInput
      return { points: body.points.map(point => ({ id: point.id, ready: true })) } as never
    }
    return {} as never
  })
  const failure = new Error('Envio interrompido')
  const result = saveImport(user, value, new AbortController().signal, vi.fn()).catch(issue => { settled = true; return issue })
  await vi.waitFor(() => expect(sent).toBe(3))
  rejectFirst(failure)
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(settled).toBe(false)
  expect(sent).toBe(3)
  releaseOthers()
  expect(await result).toBe(failure)
  expect(sent).toBe(3)
})
it('rejeita pontos vazios no limite do serviço antes de qualquer envio', async () => {
  const value = snapshot(); value.points[9].dataset.validRecords = 0
  await expect(saveImport(user, value, new AbortController().signal, vi.fn())).rejects.toThrow('Corrija todos os pontos')
  expect(api).not.toHaveBeenCalled()
})
