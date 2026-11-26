// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHandler, MAX_BODY_BYTES } from '../server/handler'
import type { Repository } from '../server/repository'
import { HttpError } from '../server/errors'
import { metadataFromDataset } from '../shared/persistence'
import { dataset } from './helpers'

const identity = { uid: 'alice', name: 'Alice', email: 'alice@example.invalid', photoURL: null }
const id = '22222222-2222-4222-8222-222222222222'
const repo: Repository = { profile: vi.fn(), preferences: vi.fn(), list: vi.fn(), start: vi.fn(), putChunk: vi.fn(), complete: vi.fn(), read: vi.fn(), readChunk: vi.fn(), update: vi.fn(), remove: vi.fn(), listImports: vi.fn(), startImport: vi.fn(), readImport: vi.fn(), startSave: vi.fn(), putImportPoint: vi.fn(), putImportBatch: vi.fn(), putImportChunk: vi.fn(), completeImportPoint: vi.fn(), completeSave: vi.fn(), readImportPoints: vi.fn(), readImportChunk: vi.fn(), removeImport: vi.fn() }
const handler = createHandler({ authenticate: async request => {
  if (request.headers.get('authorization') !== 'Bearer alice') throw new HttpError(401, 'Sessão necessária.')
  return identity
}, repository: () => repo })
function request(path: string, method = 'GET', data?: unknown, authenticated = true) {
  return new Request(`https://app.invalid/api/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer alice' } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) })
}
beforeEach(() => { vi.resetAllMocks() })

describe('contrato e autorização da API', () => {
  it('usa somente o UID autenticado nos contratos de importação e tentativa', async () => {
    const pointId = '33333333-3333-4333-8333-333333333333'
    const saveId = '44444444-4444-4444-8444-444444444444'
    const data = dataset()
    const chart = { title: 'Ponto', range: { start: data.measurements[0].timestamp, end: data.measurements.at(-1)!.timestamp } }
    const input = { id, name: 'Conjunto', fileName: data.fileName, sheetName: data.sheetName, pointCount: 10, recordCount: 30 }
    expect((await handler(request('imports', 'POST', { ...input, userUid: 'bob' }))).status).toBe(201)
    expect(repo.startImport).toHaveBeenCalledWith(identity, input)
    await handler(request('imports?offset=20')); expect(repo.listImports).toHaveBeenCalledWith('alice', 20)
    await handler(request(`imports/${id}`)); expect(repo.readImport).toHaveBeenCalledWith('alice', id)
    await handler(request(`imports/${id}/saves`, 'POST', { id: saveId, name: 'Conjunto', baseVersion: 0 }))
    expect(repo.startSave).toHaveBeenCalledWith('alice', id, { id: saveId, name: 'Conjunto', baseVersion: 0 })
    await handler(request(`imports/${id}/saves/${saveId}/points/${pointId}`, 'PUT', { ordinal: 0, metadata: metadataFromDataset(data), chart }))
    expect(repo.putImportPoint).toHaveBeenCalledWith('alice', id, saveId, pointId, expect.objectContaining({ ordinal: 0, chart }))
    await handler(request(`imports/${id}/saves/${saveId}/batch`, 'PUT', { points: [{ id: pointId, ordinal: 0, metadata: metadataFromDataset(data), chart, points: data.measurements.map(point => [point.timestamp, point.value]) }], publish: true }))
    expect(repo.putImportBatch).toHaveBeenCalledWith('alice', id, saveId, expect.objectContaining({ publish: true, points: [expect.objectContaining({ id: pointId, ordinal: 0, chart })] }))
    await handler(request(`imports/${id}/saves/${saveId}/points/${pointId}/chunks/0`, 'PUT', { points: [[1, 50]] }))
    expect(repo.putImportChunk).toHaveBeenCalledWith('alice', id, saveId, pointId, 0, expect.objectContaining({ count: 1 }))
    await handler(request(`imports/${id}/saves/${saveId}/points/${pointId}/complete`, 'POST'))
    expect(repo.completeImportPoint).toHaveBeenCalledWith('alice', id, saveId, pointId)
    await handler(request(`imports/${id}/saves/${saveId}/complete`, 'POST'))
    expect(repo.completeSave).toHaveBeenCalledWith('alice', id, saveId)
    await handler(request(`imports/${id}/points?saveId=${saveId}&offset=2`))
    expect(repo.readImportPoints).toHaveBeenCalledWith('alice', id, saveId, 2)
    await handler(request(`imports/${id}/points/${pointId}/chunks/0`))
    expect(repo.readImportChunk).toHaveBeenCalledWith('alice', id, pointId, 0)
    await handler(request(`imports/${id}`, 'DELETE')); expect(repo.removeImport).toHaveBeenCalledWith('alice', id)
  })
  it('recusa contratos inválidos de conjuntos antes de acessar a persistência', async () => {
    for (const path of ['imports?offset=-1', `imports/${id}/points?saveId=abc`, 'imports/abc']) expect((await handler(request(path))).status).toBe(400)
    expect((await handler(request('imports', 'POST', { id, name: 'A', fileName: 'a.csv', sheetName: 'CSV', pointCount: 10, recordCount: 250001 }))).status).toBe(400)
    expect((await handler(request(`imports/${id}/saves`, 'POST', { id, name: 'A', baseVersion: -1 }))).status).toBe(400)
    expect((await handler(request('imports', 'POST', { big: 'x'.repeat(MAX_BODY_BYTES) }))).status).toBe(413)
    expect((await handler(request('imports', 'GET', undefined, false))).status).toBe(401)
    expect(repo.startImport).not.toHaveBeenCalled(); expect(repo.startSave).not.toHaveBeenCalled()
  })
  it('recusa lotes vazios, repetidos e acima do limite antes de gravar', async () => {
    const data = dataset(), point = { id, ordinal: 0, chart: { title: 'P', range: { start: 0, end: 1 } }, metadata: metadataFromDataset(data) }
    for (const body of [{ points: [], publish: false }, { points: [point, point], publish: true }, { points: Array.from({ length: 101 }, () => point), publish: false }, { points: [point], publish: 'true' }]) {
      expect((await handler(request(`imports/${id}/saves/${id}/batch`, 'PUT', body))).status).toBe(400)
    }
    expect((await handler(request(`imports/${id}/saves/${id}/batch`, 'PUT', { points: [], publish: false, extra: 'x'.repeat(MAX_BODY_BYTES) }))).status).toBe(413)
    expect(repo.putImportBatch).not.toHaveBeenCalled()
  })
  it('bloqueia chamadas sem sessão antes de acessar o banco', async () => {
    expect((await handler(request('profile', 'GET', undefined, false))).status).toBe(401)
    expect(repo.profile).not.toHaveBeenCalled()
  })
  it('usa o UID autenticado em leitura, edição, blocos e exclusão', async () => {
    await handler(request('analyses'))
    expect(repo.list).toHaveBeenCalledWith('alice', 0)
    await handler(request(`analyses/${id}`))
    expect(repo.read).toHaveBeenCalledWith('alice', id)
    await handler(request(`analyses/${id}/chunks/0`))
    expect(repo.readChunk).toHaveBeenCalledWith('alice', id, 0)
    await handler(request(`analyses/${id}`, 'DELETE'))
    expect(repo.remove).toHaveBeenCalledWith('alice', id)
  })
  it('ignora identidade enviada no corpo e valida o conjunto antes de criar', async () => {
    const data = dataset()
    await handler(request('analyses', 'POST', { id, uid: 'bob', name: 'Teste', metadata: metadataFromDataset(data), chart: { title: 'Teste', range: { start: data.measurements[0].timestamp, end: data.measurements[2].timestamp } } }))
    expect(repo.start).toHaveBeenCalledWith(identity, expect.objectContaining({ id, name: 'Teste' }))
    expect((vi.mocked(repo.start).mock.calls[0][1] as unknown as Record<string, unknown>).uid).toBeUndefined()
  })
  it('valida e encaminha apenas preferências permitidas', async () => {
    expect((await handler(request('profile', 'PUT', { uid: 'bob', timezone: 'UTC', unit: 'dB(A)' }))).status).toBe(200)
    expect(repo.preferences).toHaveBeenCalledWith(identity, { timezone: 'UTC', unit: 'dB(A)' })
    expect((await handler(request('profile', 'PUT', { timezone: 'inválido', unit: '' }))).status).toBe(400)
  })
  it('preserva cores da figura ao salvar e recusa valores fora de #RRGGBB', async () => {
    const report = { headerColor: '#A1B2C3', chartBackgroundColor: '#101820', lineColor: '#FFA500' }
    const chart = { title: 'Cores da figura', range: { start: 0, end: 1000 }, report }
    expect((await handler(request(`analyses/${id}`, 'PATCH', { name: 'Teste', chart }))).status).toBe(200)
    expect(repo.update).toHaveBeenCalledWith('alice', id, 'Teste', { ...chart, report: { headerColor: '#a1b2c3', chartBackgroundColor: '#101820', lineColor: '#ffa500' } })
    vi.mocked(repo.update).mockClear()
    for (const key of Object.keys(report)) {
      for (const value of ['#fff', '#1234567', 'red', 'url(https://example.invalid)', null, 123]) {
        expect((await handler(request(`analyses/${id}`, 'PATCH', { name: 'Teste', chart: { ...chart, report: { [key]: value } } }))).status).toBe(400)
      }
    }
    expect(repo.update).not.toHaveBeenCalled()
  })
  it('rejeita páginas, identificadores, índices, dados e tamanhos inválidos', async () => {
    for (const path of ['analyses?offset=-1', 'analyses/abc', `analyses/${id}/chunks/999`]) expect((await handler(request(path))).status).toBe(400)
    expect((await handler(request(`analyses/${id}/chunks/0`, 'PUT', { points: [[2, 50], [1, 60]] }))).status).toBe(400)
    expect((await handler(request(`analyses/${id}/chunks/0`, 'PUT', { points: Array.from({ length: 5001 }, () => [1, 50]) }))).status).toBe(400)
    expect((await handler(request('profile', 'PUT', { big: 'x'.repeat(MAX_BODY_BYTES) }))).status).toBe(413)
    expect(repo.putChunk).not.toHaveBeenCalled()
  })
  it('preserva duplicados no bloco e recusa números não finitos', async () => {
    await handler(request(`analyses/${id}/chunks/0`, 'PUT', { points: [[1, 0], [1, 50], [2, 60]] }))
    expect(repo.putChunk).toHaveBeenCalledWith('alice', id, 0, { points: [[1, 0], [1, 50], [2, 60]], first: 1, last: 2, count: 3, duplicates: 1 })
    expect((await handler(request(`analyses/${id}/chunks/0`, 'PUT', { points: [[1, null]] }))).status).toBe(400)
  })
  it('não revela conexão, SQL ou mensagens internas em erros', async () => {
    vi.mocked(repo.profile).mockRejectedValue(new Error('postgresql://secret:password@example.invalid/private SQL SELECT'))
    const response = await handler(request('profile'))
    expect(response.status).toBe(503)
    expect(await response.text()).not.toMatch(/password|secret:|SELECT/)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
