// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHandler, MAX_BODY_BYTES } from '../server/handler'
import type { Repository } from '../server/repository'
import { HttpError } from '../server/errors'
import { metadataFromDataset } from '../shared/persistence'
import { dataset } from './helpers'

const identity = { uid: 'alice', name: 'Alice', email: 'alice@example.invalid', photoURL: null }
const id = '22222222-2222-4222-8222-222222222222'
const repo: Repository = { profile: vi.fn(), preferences: vi.fn(), list: vi.fn(), start: vi.fn(), putChunk: vi.fn(), complete: vi.fn(), read: vi.fn(), readChunk: vi.fn(), update: vi.fn(), remove: vi.fn() }
const handler = createHandler({ authenticate: async request => {
  if (request.headers.get('authorization') !== 'Bearer alice') throw new HttpError(401, 'Sessão necessária.')
  return identity
}, repository: () => repo })
function request(path: string, method = 'GET', data?: unknown, authenticated = true) {
  return new Request(`https://app.invalid/api/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer alice' } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) })
}
beforeEach(() => { vi.resetAllMocks() })

describe('contrato e autorização da API', () => {
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
