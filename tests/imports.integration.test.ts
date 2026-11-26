// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { loadEnv } from 'vite'
import { testClient } from './database-client'
import { createRepository } from '../server/repository'
import { chunk } from '../server/validation'
import { metadataFromDataset } from '../shared/persistence'
import { dataset } from './helpers'
import { testDatabaseConnection } from '../scripts/test-database.mjs'

const integration = process.env.RUN_NEON_INTEGRATION === '1' ? it : it.skip
integration('PostgreSQL: dez pontos, publicação atômica, repetição, versões, limites e isolamento', async () => {
  const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
  const connection = testDatabaseConnection(env.TEST_DATABASE_URL, [env.DATABASE_URL, env.DATABASE_URL_UNPOOLED, env.DATABASE_URL_POOLED])
  const client = await testClient(connection)
  const repo = createRepository(connection, client)
  const alice = { uid: `__import_test_${randomUUID()}`, name: 'Teste', email: 'teste@example.invalid', photoURL: null }
  const bob = { ...alice, uid: `__import_test_${randomUUID()}` }
  const id = randomUUID(), saveId = randomUUID()
  const values = Array.from({ length: 10 }, (_, ordinal) => {
    const data = dataset(); data.fileName = 'dez-pontos.csv'; data.point = { id: `P${ordinal + 1}` }
    return { id: randomUUID(), ordinal, metadata: metadataFromDataset(data), points: data.measurements.map(point => [point.timestamp, point.value]),
      chart: { title: `Ponto ${ordinal + 1}`, range: { start: data.measurements[0].timestamp, end: data.measurements.at(-1)!.timestamp },
        report: { address: `Rua ${ordinal}`, headerColor: '#123456', lineColor: '#f97316' } } }
  })
  try {
    await repo.profile(bob)
    const input = { id, name: 'Dez pontos', fileName: values[0].metadata.fileName, sheetName: values[0].metadata.sheetName, pointCount: 10, recordCount: 30 }
    await Promise.all([repo.startImport(alice, input), repo.startImport(alice, input)])
    await Promise.all([repo.startSave(alice.uid, id, { id: saveId, baseVersion: 0, name: input.name }), repo.startSave(alice.uid, id, { id: saveId, baseVersion: 0, name: input.name })])
    for (const [index, value] of values.entries()) {
      await repo.putImportPoint(alice.uid, id, saveId, value.id, value)
      if (index === 9) break
      await repo.putImportChunk(alice.uid, id, saveId, value.id, 0, chunk(value.points))
      await repo.completeImportPoint(alice.uid, id, saveId, value.id)
    }
    await expect(repo.completeSave(alice.uid, id, saveId)).rejects.toMatchObject({ status: 409 })
    expect((await repo.listImports(alice.uid, 0)).total).toBe(0)
    await expect(repo.readImport(alice.uid, id)).rejects.toMatchObject({ status: 404 })
    await expect(repo.readImportChunk(alice.uid, id, values[0].id, 0)).rejects.toMatchObject({ status: 404 })
    await expect(repo.readImportPoints(alice.uid, id, saveId, 0)).rejects.toMatchObject({ status: 404 })
    for (const value of values.slice(0, 9)) expect((await repo.putImportPoint(alice.uid, id, saveId, value.id, value)).ready).toBe(true)
    const last = values[9]
    await repo.putImportChunk(alice.uid, id, saveId, last.id, 0, chunk(last.points))
    await repo.putImportChunk(alice.uid, id, saveId, last.id, 0, chunk(last.points))
    await expect(repo.putImportChunk(alice.uid, id, saveId, last.id, 0, chunk(last.points.map(([time]) => [time, 99])))).rejects.toMatchObject({ status: 409 })
    await repo.completeImportPoint(alice.uid, id, saveId, last.id)
    const published = await repo.completeSave(alice.uid, id, saveId)
    expect(published).toMatchObject({ id: saveId, state: 'committed', version: 1 })
    expect(await repo.completeSave(alice.uid, id, saveId)).toEqual(published)
    expect((await repo.listImports(alice.uid, 0)).imports).toHaveLength(1)
    expect(await client.analysis.count({ where: { userUid: alice.uid } })).toBe(10)
    expect(await client.analysisChunk.count({ where: { userUid: alice.uid } })).toBe(10)
    expect((await repo.readImportPoints(alice.uid, id, saveId, 0)).points.map(point => point.chart)).toEqual(values.map(value => value.chart))
    for (const value of values) expect(await repo.readImportChunk(alice.uid, id, value.id, 0)).toEqual(value.points)
    await expect(repo.update(alice.uid, values[0].id, 'Isolado', values[0].chart)).rejects.toMatchObject({ status: 409 })
    await expect(repo.remove(alice.uid, values[0].id)).rejects.toMatchObject({ status: 409 })
    await expect(repo.putImportChunk(alice.uid, id, saveId, last.id, 0, chunk(last.points))).rejects.toMatchObject({ status: 409 })

    const updateId = randomUUID(), competitor = randomUUID()
    await repo.startSave(alice.uid, id, { id: updateId, baseVersion: 1, name: 'Atualizada' })
    await repo.startSave(alice.uid, id, { id: competitor, baseVersion: 1, name: 'Concorrente' })
    const png = `data:image/png;base64,iVBORw0KGgo${'A'.repeat(170000)}=`
    for (const value of values) {
      const chart = { ...value.chart, title: 'Novo título', report: { ...value.chart.report, logo: png } }
      await repo.putImportPoint(alice.uid, id, updateId, value.id, { ordinal: value.ordinal, chart })
      await repo.putImportPoint(alice.uid, id, competitor, value.id, { ordinal: value.ordinal, chart: value.chart })
    }
    expect((await repo.readImport(alice.uid, id)).saveId).toBe(saveId)
    expect((await repo.readImportPoints(alice.uid, id, saveId, 0)).points[0].chart.title).toBe('Ponto 1')
    const next = await repo.completeSave(alice.uid, id, updateId)
    expect(next.version).toBe(2)
    await expect(repo.completeSave(alice.uid, id, competitor)).rejects.toMatchObject({ status: 409 })
    await expect(repo.startSave(alice.uid, id, { id: randomUUID(), baseVersion: 1, name: 'Antiga' })).rejects.toMatchObject({ status: 409 })
    expect((await repo.completeSave(alice.uid, id, saveId)).version).toBe(1)
    const firstPage = await repo.readImportPoints(alice.uid, id, updateId, 0)
    expect(Buffer.byteLength(JSON.stringify(firstPage))).toBeLessThan(512 * 1024)
    expect(firstPage.nextOffset).toBe(2)
    let offset: number | null = 0, count = 0
    do {
      const page = await repo.readImportPoints(alice.uid, id, updateId, offset)
      count += page.points.length; offset = page.nextOffset
      expect(page.points.every(point => point.chart.title === 'Novo título')).toBe(true)
    } while (offset !== null)
    expect(count).toBe(10)
    expect(await client.analysisChunk.count({ where: { userUid: alice.uid } })).toBe(10)
    expect((await repo.listImports(bob.uid, 0)).total).toBe(0)
    await Promise.all([repo.readImport(bob.uid, id), repo.readImportPoints(bob.uid, id, updateId, 0), repo.readImportChunk(bob.uid, id, last.id, 0), repo.removeImport(bob.uid, id), repo.startSave(bob.uid, id, { id: randomUUID(), baseVersion: 2, name: 'Bob' }), repo.putImportPoint(bob.uid, id, updateId, last.id, { ordinal: 9, chart: last.chart })]
      .map(operation => expect(operation).rejects.toMatchObject({ status: 404 })))
    await repo.removeImport(alice.uid, id)
    expect(await client.analysisChunk.count({ where: { userUid: alice.uid } })).toBe(0)
    expect(await client.analysis.count({ where: { userUid: alice.uid } })).toBe(0)
    expect(await client.importSave.count({ where: { userUid: alice.uid } })).toBe(0)
    expect(await client.importSavePoint.count({ where: { userUid: alice.uid } })).toBe(0)
  } finally {
    await client.profile.deleteMany({ where: { uid: { in: [alice.uid, bob.uid] } } })
    await client.$disconnect()
  }
}, 120_000)
