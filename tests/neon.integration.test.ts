// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { createPrismaClient } from '../server/prisma'
import { loadEnv } from 'vite'
import { expect, it } from 'vitest'
import { createRepository } from '../server/repository'
import { chunk } from '../server/validation'
import { metadataFromDataset } from '../shared/persistence'
import { dataset } from './helpers'

const integration = process.env.RUN_NEON_INTEGRATION === '1' ? it : it.skip
integration('Neon real: preferências, blocos, isolamento, conclusão, leitura e exclusão', async () => {
  const connection = process.env.DATABASE_URL || loadEnv('development', process.cwd(), '').DATABASE_URL
  if (!connection) throw new Error('DATABASE_URL não configurada para a integração.')
  const client = createPrismaClient(connection)
  const repo = createRepository(connection, client)
  const uid = `__decicharts_test_${randomUUID()}`
  const otherUid = `__decicharts_test_${randomUUID()}`
  const alice = { uid, name: 'Teste sintético', email: 'teste@example.invalid', photoURL: null }
  const bob = { ...alice, uid: otherUid }
  try {
    await repo.profile(alice)
    await repo.profile(bob)
    await repo.preferences(alice, { timezone: 'UTC', unit: 'dB(A)' })
    expect((await repo.profile(alice)).preferences).toEqual({ timezone: 'UTC', unit: 'dB(A)' })
    const data = dataset()
    data.measurements = Array.from({ length: 5001 }, (_, index) => ({ timestamp: 1735700400000 + Math.min(index, 4999) * 1000, value: index % 80 }))
    data.totalRecords = data.validRecords = 5001
    data.duplicateTimestamps = 1
    data.mapping.unit = data.unit
    const metadata = metadataFromDataset(data)
    const id = randomUUID()
    const chart = { title: 'Teste de integração', range: { start: data.measurements[0].timestamp, end: data.measurements.at(-1)!.timestamp } }
    const input = { id, name: 'Teste isolado', metadata, chart }
    await Promise.all([repo.start(alice, input), repo.start(alice, input)])
    const first = chunk(data.measurements.slice(0, 5000).map(point => [point.timestamp, point.value]))
    await Promise.all([repo.putChunk(uid, id, 0, first), repo.putChunk(uid, id, 0, first)])
    await expect(repo.complete(uid, id)).rejects.toMatchObject({ status: 409 })
    expect((await repo.list(uid, 0)).analyses).toHaveLength(0)
    await repo.putChunk(uid, id, 1, chunk(data.measurements.slice(5000).map(point => [point.timestamp, point.value])))
    const completions = await Promise.all([repo.complete(uid, id), repo.complete(uid, id)])
    const completed = completions[0]
    expect(completions[1].analysis.id).toBe(id)
    expect(completed.analysis.count).toBe(5001)
    expect((await repo.complete(uid, id)).analysis.id).toBe(id)
    expect((await repo.start(alice, input)).state).toBe('ready')
    expect((await repo.list(uid, 0)).analyses).toHaveLength(1)
    expect((await repo.list(otherUid, 0)).analyses).toHaveLength(0)
    await expect(repo.read(otherUid, id)).rejects.toMatchObject({ status: 404 })
    await expect(repo.readChunk(otherUid, id, 0)).rejects.toMatchObject({ status: 404 })
    await expect(repo.remove(otherUid, id)).rejects.toMatchObject({ status: 404 })
    const points = [...await repo.readChunk(uid, id, 0), ...await repo.readChunk(uid, id, 1)]
    expect(points).toEqual(data.measurements.map(point => [point.timestamp, point.value]))
    await expect(repo.putChunk(uid, id, 0, first)).rejects.toMatchObject({ status: 409 })
    const updated = await repo.update(uid, id, 'Nome atualizado', { title: 'Título atualizado', range: { start: chart.range.start + 1000, end: chart.range.end } })
    expect(updated.analysis.chart.title).toBe('Título atualizado')
    await expect(repo.update(uid, id, 'Inválido', { ...chart, range: { start: 0, end: 1 } })).rejects.toMatchObject({ status: 400 })
    await repo.remove(uid, id)
    await expect(repo.read(uid, id)).rejects.toMatchObject({ status: 404 })
    expect(await client.analysisChunk.count({ where: { userUid: uid } })).toBe(0)
    const unorderedId = randomUUID()
    await repo.start(alice, { ...input, id: unorderedId, metadata: { ...metadata, duplicateTimestamps: 0 } })
    await repo.putChunk(uid, unorderedId, 0, first)
    await repo.putChunk(uid, unorderedId, 1, chunk([[chart.range.start + 1000, 70]]))
    await expect(repo.complete(uid, unorderedId)).rejects.toMatchObject({ status: 409 })
    expect((await repo.list(uid, 0)).analyses).toHaveLength(0)
    await repo.remove(uid, unorderedId)
    console.log('Integração Neon verificada com 5.001 pontos, dois usuários de teste e exclusão em cascata.')
  } catch (error) {
    if (error instanceof Error && error.name === 'AssertionError') throw error
    if (error && typeof error === 'object' && 'code' in error) console.error('Código de falha PostgreSQL:', String(error.code))
    throw new Error('Falha no teste Neon. Credenciais e mensagens internas foram omitidas.')
  } finally {
    try {
      await client.profile.deleteMany({ where: { uid: { in: [uid, otherUid] } } })
      console.log('Registros sintéticos de integração removidos.')
    } finally { await client.$disconnect() }
  }
}, 120_000)
