// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import type { User } from 'firebase/auth'
import { api } from '../src/lib/api'
import { saveImport, type SaveSnapshot } from '../src/features/analyses/import-service'
import { dataset } from './helpers'

vi.mock('../src/lib/api', async original => ({ ...await original<typeof import('../src/lib/api')>(), api: vi.fn() }))
const user = {} as User
beforeEach(() => vi.clearAllMocks())
function snapshot(): SaveSnapshot {
  return { id: 'import', saveId: 'attempt', baseVersion: 0, name: 'Dez pontos', points: Array.from({ length: 10 }, (_, ordinal) => {
    const data = dataset()
    return { id: `point-${ordinal}`, ordinal, dataset: data, view: { title: `P${ordinal}`, range: { start: data.measurements[0].timestamp, end: data.measurements.at(-1)!.timestamp } } }
  }) }
}
it('limita globalmente os envios a três e não reenvia medições ao atualizar ajustes', async () => {
  const value = snapshot()
  let active = 0, maximum = 0, chunks = 0
  vi.mocked(api).mockImplementation(async (_, path) => {
    active++; maximum = Math.max(maximum, active)
    await new Promise(resolve => setTimeout(resolve, 1))
    active--
    if (path.endsWith('/saves')) return { id: value.saveId, state: 'uploading', version: null } as never
    if (path.match(/\/points\/point-\d+$/)) return { ready: value.baseVersion > 0 } as never
    if (path.includes('/chunks/')) chunks++
    if (path.endsWith(`/${value.saveId}/complete`)) return { id: value.saveId, state: 'committed', version: value.baseVersion + 1 } as never
    return {} as never
  })
  const saved = await saveImport(user, value, new AbortController().signal, vi.fn())
  expect(saved.pointCount).toBe(10); expect(chunks).toBe(10); expect(maximum).toBe(3)
  value.baseVersion = 1; value.saveId = 'next'
  await saveImport(user, value, new AbortController().signal, vi.fn())
  expect(chunks).toBe(10)
})
it('reconhece uma tentativa já publicada após perder a confirmação, sem reenviar pontos', async () => {
  vi.mocked(api).mockResolvedValue({ id: 'attempt', state: 'committed', version: 1 } as never)
  const saved = await saveImport(user, snapshot(), new AbortController().signal, vi.fn())
  expect(saved.version).toBe(1)
  expect(vi.mocked(api).mock.calls.map(call => call[1])).toEqual(['imports', 'imports/import/saves'])
})
it('rejeita pontos vazios no limite do serviço antes de qualquer envio', async () => {
  const value = snapshot(); value.points[9].dataset.validRecords = 0
  await expect(saveImport(user, value, new AbortController().signal, vi.fn())).rejects.toThrow('Corrija todos os pontos')
  expect(api).not.toHaveBeenCalled()
})
