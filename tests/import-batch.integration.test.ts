// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { loadEnv } from 'vite'
import { testClient } from './database-client'
import { createRepository } from '../server/repository'
import { chunk } from '../server/validation'
import { metadataFromDataset, type ImportBatchPoint, type PointTuple } from '../shared/persistence'
import { dataset } from './helpers'
import { testDatabaseConnection } from '../scripts/test-database.mjs'

const integration = process.env.RUN_NEON_INTEGRATION === '1' ? it : it.skip
function values(): ImportBatchPoint[] {
  return Array.from({ length: 10 }, (_, ordinal) => {
    const data = dataset(); data.fileName = 'lote.csv'; data.point = { id: `P${ordinal + 1}` }
    data.timeBasis = data.mapping.timeBasis = 'elapsed'
    data.measurements = Array.from({ length: 60 }, (_, index) => ({ timestamp: (index + 1) * 1000, value: 50 + index % 10 }))
    data.totalRecords = data.validRecords = 60
    return { id: randomUUID(), ordinal, metadata: metadataFromDataset(data), chart: { title: `P${ordinal}`, range: { start: 1000, end: 60000 } }, points: data.measurements.map((value): PointTuple => [value.timestamp, value.value]) }
  })
}
function connection() {
  const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
  return testDatabaseConnection(env.TEST_DATABASE_URL, [env.DATABASE_URL, env.DATABASE_URL_UNPOOLED, env.DATABASE_URL_POOLED])
}

integration('lote: rollback no último ponto, repetição, publicação, atualização e isolamento', async () => {
  const url = connection(), client = await testClient(url), repo = createRepository(url, client)
  const alice = { uid: `__batch_${randomUUID()}`, name: 'Teste', email: 'teste@example.invalid', photoURL: null }
  const id = randomUUID(), saveId = randomUUID(), points = values()
  const name = 'Lote de dez pontos'
  try {
    await repo.startImport(alice, { id, name, fileName: 'lote.csv', sheetName: points[0].metadata!.sheetName, pointCount: 10, recordCount: 600 })
    await repo.startSave(alice.uid, id, { id: saveId, name, baseVersion: 0 })
    const invalid = structuredClone(points); invalid[9].metadata!.point!.id = 'P1'
    await expect(repo.putImportBatch(alice.uid, id, saveId, { points: invalid, publish: true })).rejects.toMatchObject({ status: 400 })
    expect(await client.analysis.count({ where: { userUid: alice.uid } })).toBe(0)
    expect(await client.analysisChunk.count({ where: { userUid: alice.uid } })).toBe(0)
    expect(await client.importSavePoint.count({ where: { userUid: alice.uid } })).toBe(0)
    expect((await repo.listImports(alice.uid, 0)).total).toBe(0)
    const staged = await repo.putImportBatch(alice.uid, id, saveId, { points, publish: false })
    expect(staged.points.every(point => point.ready)).toBe(true)
    expect(staged.committed).toBeUndefined()
    const changed = structuredClone(points); changed[9].points![0][1] = 99
    await expect(repo.putImportBatch(alice.uid, id, saveId, { points: changed, publish: false })).rejects.toMatchObject({ status: 409 })
    const saved = await repo.putImportBatch(alice.uid, id, saveId, { points, publish: true })
    expect(saved.committed).toMatchObject({ state: 'committed', version: 1 })
    // Both legacy completions can observe an uploading root before one publishes.
    // A delayed seal for the same committed snapshot remains idempotent.
    await repo.completeImportPoint(alice.uid, id, saveId, points[0].id)
    expect((await repo.startSave(alice.uid, id, { id: saveId, name, baseVersion: 0 })).state).toBe('committed')
    expect((await repo.listImports(alice.uid, 0)).total).toBe(1)
    expect(await client.analysis.count({ where: { userUid: alice.uid } })).toBe(10)
    expect(await client.analysisChunk.count({ where: { userUid: alice.uid } })).toBe(10)
    for (const point of points) expect(await repo.readImportChunk(alice.uid, id, point.id, 0)).toEqual(point.points)
    const updateId = randomUUID(), stale = randomUUID()
    await repo.startSave(alice.uid, id, { id: updateId, name: 'Ajustes', baseVersion: 1 })
    await repo.startSave(alice.uid, id, { id: stale, name: 'Concorrente', baseVersion: 1 })
    const updated = points.map(point => ({ id: point.id, ordinal: point.ordinal, chart: { ...point.chart, report: { lineColor: '#ff8000' } } }))
    expect((await repo.putImportBatch(alice.uid, id, updateId, { points: updated, publish: true })).committed?.version).toBe(2)
    expect(await client.analysisChunk.count({ where: { userUid: alice.uid } })).toBe(10)
    expect((await repo.readImportPoints(alice.uid, id, updateId, 0)).points.map(point => point.chart)).toEqual(updated.map(point => point.chart))
    await expect(repo.putImportBatch(alice.uid, id, stale, { points: updated, publish: true })).rejects.toMatchObject({ status: 409 })
    await expect(repo.putImportBatch('another-user', id, updateId, { points: updated, publish: true })).rejects.toMatchObject({ status: 404 })
    await repo.removeImport(alice.uid, id)
    expect(await client.analysisChunk.count({ where: { userUid: alice.uid } })).toBe(0)
  } finally { await client.profile.deleteMany({ where: { uid: alice.uid } }); await client.$disconnect() }
}, 120_000)

integration('benchmark: dez pontos/600 medições usam menos da metade das consultas do protocolo anterior', async () => {
  const url = connection(); let queries = 0
  const client = await testClient(url, () => { queries++ }), repo = createRepository(url, client)
  const alice = { uid: `__batch_benchmark_${randomUUID()}`, name: 'Teste', email: 'teste@example.invalid', photoURL: null }
  const samples: { mode: string; queries: number; ms: number }[] = []
  try {
    await repo.profile(alice)
    for (const mode of ['individual', 'batch']) {
      const id = randomUUID(), saveId = randomUUID(), points = values()
      queries = 0; const started = performance.now()
      await repo.startImport(alice, { id, name: 'Comparativo', fileName: 'lote.csv', sheetName: points[0].metadata!.sheetName, pointCount: 10, recordCount: 600 })
      await repo.startSave(alice.uid, id, { id: saveId, name: 'Comparativo', baseVersion: 0 })
      if (mode === 'individual') {
        for (const point of points) {
          await repo.putImportPoint(alice.uid, id, saveId, point.id, point)
          await repo.putImportChunk(alice.uid, id, saveId, point.id, 0, chunk(point.points))
          await repo.completeImportPoint(alice.uid, id, saveId, point.id)
        }
        await repo.completeSave(alice.uid, id, saveId)
      } else await repo.putImportBatch(alice.uid, id, saveId, { points, publish: true })
      samples.push({ mode, queries, ms: Math.round(performance.now() - started) })
    }
    if (['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) {
      expect(samples[0].queries).toBeGreaterThan(0)
      expect(samples[1].queries).toBeGreaterThan(0)
      expect(samples[1].queries).toBeLessThan(samples[0].queries / 2)
    }
    expect((await repo.listImports(alice.uid, 0)).total).toBe(2)
    process.stdout.write(`Benchmark em banco de teste (não representa latência Neon): ${JSON.stringify(samples)}\n`)
  } finally { await client.profile.deleteMany({ where: { uid: alice.uid } }); await client.$disconnect() }
}, 120_000)
