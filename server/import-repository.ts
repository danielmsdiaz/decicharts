import { isDeepStrictEqual } from 'node:util'
import type { Prisma, PrismaClient, MeasurementImport, ImportSave } from './generated/prisma/client'
import type { ImportInput, SaveInput, SaveReceipt, ImportSummary, ImportPointInput, ImportPage, ImportPointPage, DatasetMetadata, ChartView } from '../shared/persistence'
import { CHUNK_SIZE, MAX_POINTS } from '../shared/persistence'
import { HttpError, notFound } from './errors'
import type { Identity } from './auth'
import type { chunk } from './validation'
import { checkRange, sealPoint, writePointChunk } from './point-storage'

export interface ImportRepository {
  listImports(uid: string, offset: number): Promise<ImportPage>
  startImport(identity: Identity, input: ImportInput): Promise<ImportSummary>
  readImport(uid: string, id: string): Promise<ImportSummary>
  startSave(uid: string, id: string, input: SaveInput): Promise<SaveReceipt>
  putImportPoint(uid: string, id: string, saveId: string, pointId: string, input: ImportPointInput): Promise<{ ready: boolean }>
  putImportChunk(uid: string, id: string, saveId: string, pointId: string, index: number, value: ReturnType<typeof chunk>): Promise<void>
  completeImportPoint(uid: string, id: string, saveId: string, pointId: string): Promise<void>
  completeSave(uid: string, id: string, saveId: string): Promise<SaveReceipt>
  readImportPoints(uid: string, id: string, saveId: string, offset: number): Promise<ImportPointPage>
  readImportChunk(uid: string, id: string, pointId: string, index: number): Promise<number[][]>
  removeImport(uid: string, id: string): Promise<void>
}
export const importKey = (userUid: string, id: string) => ({ userUid_id: { userUid, id } })
const saveKey = (userUid: string, importId: string, id: string) => ({ userUid_importId_id: { userUid, importId, id } })
const pointKey = (userUid: string, importId: string, saveId: string, pointId: string) => ({ userUid_importId_saveId_pointId: { userUid, importId, saveId, pointId } })
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
export const importSummary = (row: MeasurementImport): ImportSummary => ({
  id: row.id, name: row.name, fileName: row.fileName, sheetName: row.sheetName, pointCount: row.pointCount,
  recordCount: row.recordCount, version: row.version, saveId: row.activeSaveId, updatedAt: row.updatedAt.toISOString(),
})
const receipt = (row: ImportSave): SaveReceipt => ({ id: row.id, state: row.state as SaveReceipt['state'], version: row.version, updatedAt: row.updatedAt.toISOString() })
const conflict = () => new HttpError(409, 'A análise foi alterada em outra sessão ou o envio não corresponde. Reabra a versão salva para continuar; seus ajustes locais foram preservados.')

// Serialize publication, point registration, chunk sealing and deletion by owner/import.
// These transactions never span a network transfer. SQL values stay parameterized.
async function lockImport(tx: Prisma.TransactionClient, uid: string, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM decicharts.measurement_imports WHERE user_uid=${uid} AND id=${id}::uuid FOR UPDATE`
  if (!rows.length) throw notFound()
  return tx.measurementImport.findUniqueOrThrow({ where: importKey(uid, id) })
}
async function pending(tx: Prisma.TransactionClient, uid: string, id: string, saveId: string) {
  const root = await lockImport(tx, uid, id)
  const save = await tx.importSave.findUnique({ where: saveKey(uid, id, saveId) })
  if (!save) throw notFound()
  if (save.state !== 'uploading' || save.baseVersion !== root.version) throw conflict()
  await tx.importSave.update({ where: saveKey(uid, id, saveId), data: { updatedAt: new Date() } })
  if (root.state === 'uploading') await tx.measurementImport.update({ where: importKey(uid, id), data: { updatedAt: new Date() } })
  return root
}
async function member(tx: Prisma.TransactionClient, uid: string, id: string, saveId: string, pointId: string) {
  const snapshot = await tx.importSavePoint.findUnique({ where: pointKey(uid, id, saveId, pointId), include: { point: true } })
  if (!snapshot) throw notFound()
  return snapshot
}

export function createImportRepository(client: PrismaClient, ensureProfile: (identity: Identity) => Promise<unknown>): ImportRepository {
  return {
    async listImports(uid, offset) {
      const where = { userUid: uid, state: 'ready' }
      const [rows, total] = await client.$transaction([
        client.measurementImport.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: offset, take: 20 }),
        client.measurementImport.count({ where }),
      ])
      return { imports: rows.map(importSummary), total, hasMore: offset + rows.length < total }
    },
    async startImport(identity, input) {
      await ensureProfile(identity)
      if (input.pointCount > input.recordCount) throw new HttpError(400, 'Todos os pontos precisam ter pelo menos uma medição válida.')
      const cutoff = new Date(Date.now() - 86_400_000)
      await client.measurementImport.deleteMany({ where: { userUid: identity.uid, state: 'uploading', updatedAt: { lt: cutoff } } })
      await client.importSave.deleteMany({ where: { userUid: identity.uid, updatedAt: { lt: cutoff }, publishedBy: { none: {} } } })
      return client.$transaction(async tx => {
        const { id, ...data } = input
        await tx.measurementImport.createMany({ data: [{ ...data, id, userUid: identity.uid }], skipDuplicates: true })
        const row = await lockImport(tx, identity.uid, id)
        if (row.fileName !== input.fileName || row.sheetName !== input.sheetName || row.pointCount !== input.pointCount || row.recordCount !== input.recordCount) throw conflict()
        return importSummary(row)
      })
    },
    async readImport(uid, id) {
      const row = await client.measurementImport.findFirst({ where: { userUid: uid, id, state: 'ready' } })
      if (!row) throw notFound()
      return importSummary(row)
    },
    async startSave(uid, id, input) {
      return client.$transaction(async tx => {
        const root = await lockImport(tx, uid, id)
        const old = await tx.importSave.findUnique({ where: saveKey(uid, id, input.id) })
        if (old) {
          if (old.name !== input.name || old.baseVersion !== input.baseVersion) throw conflict()
          if (old.state === 'uploading' && root.version !== input.baseVersion) throw conflict()
          return receipt(old)
        }
        if (root.version !== input.baseVersion) throw conflict()
        return receipt(await tx.importSave.create({ data: { userUid: uid, importId: id, ...input } }))
      })
    },
    async putImportPoint(uid, id, saveId, pointId, input) {
      return client.$transaction(async tx => {
        const root = await pending(tx, uid, id, saveId)
        if (input.ordinal >= root.pointCount) throw new HttpError(400, 'Posição de ponto inválida.')
        let point = await tx.analysis.findUnique({ where: importKey(uid, pointId) })
        if (point && (point.importId !== id || point.ordinal !== input.ordinal)) throw conflict()
        if (!point) {
          if (root.state !== 'uploading' || !input.metadata) throw conflict()
          const metadata = input.metadata
          if (metadata.fileName !== root.fileName || metadata.sheetName !== root.sheetName) throw new HttpError(400, 'O ponto deve pertencer ao arquivo e à aba da importação.')
          const aggregate = await tx.analysis.aggregate({ where: { userUid: uid, importId: id }, _sum: { recordCount: true }, _count: true })
          if (aggregate._count >= root.pointCount || (aggregate._sum.recordCount ?? 0) + metadata.validRecords > root.recordCount) throw new HttpError(400, 'O conjunto excede as quantidades declaradas.')
          if (await tx.analysis.findFirst({ where: { userUid: uid, importId: id, ordinal: input.ordinal } })) throw conflict()
          point = await tx.analysis.create({ data: { userUid: uid, id: pointId, importId: id, ordinal: input.ordinal, name: root.name,
            metadata: asJson(metadata), chart: asJson(input.chart), recordCount: metadata.validRecords, chunkCount: Math.ceil(metadata.validRecords / CHUNK_SIZE) } })
        } else if (input.metadata && !isDeepStrictEqual(point.metadata, input.metadata)) throw conflict()
        if (point.state === 'ready') checkRange(point, input.chart)
        const old = await tx.importSavePoint.findUnique({ where: pointKey(uid, id, saveId, pointId) })
        if (old) {
          if (!isDeepStrictEqual(old.chart, input.chart) || old.ordinal !== input.ordinal) throw conflict()
        } else {
          if (await tx.importSavePoint.findFirst({ where: { userUid: uid, importId: id, saveId, ordinal: input.ordinal } })) throw conflict()
          await tx.importSavePoint.create({ data: { userUid: uid, importId: id, saveId, pointId, ordinal: input.ordinal, chart: asJson(input.chart) } })
        }
        return { ready: point.state === 'ready' }
      })
    },
    async putImportChunk(uid, id, saveId, pointId, index, value) {
      await client.$transaction(async tx => {
        const root = await pending(tx, uid, id, saveId)
        if (root.state !== 'uploading') throw conflict()
        const snapshot = await member(tx, uid, id, saveId, pointId)
        await writePointChunk(tx, snapshot.point, index, value)
      })
    },
    async completeImportPoint(uid, id, saveId, pointId) {
      await client.$transaction(async tx => {
        await pending(tx, uid, id, saveId)
        const snapshot = await member(tx, uid, id, saveId, pointId)
        await sealPoint(tx, snapshot.point, snapshot.chart as unknown as ChartView)
      })
    },
    async completeSave(uid, id, saveId) {
      return client.$transaction(async tx => {
        const root = await lockImport(tx, uid, id)
        const save = await tx.importSave.findUnique({ where: saveKey(uid, id, saveId) })
        if (!save) throw notFound()
        if (save.state === 'committed') return receipt(save)
        if (save.baseVersion !== root.version) throw conflict()
        const [points, snapshots] = await Promise.all([
          tx.analysis.findMany({ where: { userUid: uid, importId: id }, orderBy: { ordinal: 'asc' }, select: { id: true, ordinal: true, state: true, recordCount: true, metadata: true } }),
          tx.importSavePoint.findMany({ where: { userUid: uid, importId: id, saveId }, orderBy: { ordinal: 'asc' }, select: { pointId: true, ordinal: true } }),
        ])
        if (points.length !== root.pointCount || snapshots.length !== root.pointCount || points.some((point, index) => point.state !== 'ready' || point.ordinal !== index || snapshots[index].ordinal !== index || snapshots[index].pointId !== point.id)
          || points.reduce((sum, point) => sum + point.recordCount, 0) !== root.recordCount || root.recordCount > MAX_POINTS) throw new HttpError(409, 'Faltam pontos ou medições. O conjunto não foi publicado; tente novamente.')
        const ids = points.map(point => (point.metadata as unknown as DatasetMetadata).point?.id).filter((value): value is string => !!value).map(value => value.normalize('NFC').trim().toLocaleUpperCase('pt-BR'))
        if (new Set(ids).size !== ids.length) throw new HttpError(400, 'Há pontos com identificação repetida na importação.')
        const version = root.version + 1
        await tx.measurementImport.update({ where: importKey(uid, id), data: { name: save.name, state: 'ready', activeSaveId: saveId, version, updatedAt: new Date() } })
        return receipt(await tx.importSave.update({ where: saveKey(uid, id, saveId), data: { state: 'committed', version, updatedAt: new Date() } }))
      })
    },
    async readImportPoints(uid, id, saveId, offset) {
      if (!await client.measurementImport.findFirst({ where: { userUid: uid, id, state: 'ready' } })) throw notFound()
      const save = await client.importSave.findFirst({ where: { userUid: uid, importId: id, id: saveId, state: 'committed', import: { state: 'ready' } } })
      if (!save) throw new HttpError(409, 'A versão solicitada não está disponível. Abra a análise novamente.')
      const rows = await client.importSavePoint.findMany({ where: { userUid: uid, importId: id, saveId }, orderBy: { ordinal: 'asc' }, skip: offset, take: 20, include: { point: true } })
      const points: ImportPointPage['points'] = []
      let bytes = 0
      for (const row of rows) {
        const value = { id: row.pointId, ordinal: row.ordinal, metadata: row.point.metadata as unknown as DatasetMetadata, chart: row.chart as unknown as ChartView, chunkCount: row.point.chunkCount }
        const size = Buffer.byteLength(JSON.stringify(value))
        if (bytes + size > 480 * 1024) break
        points.push(value); bytes += size
      }
      if (rows.length && !points.length) throw new HttpError(413, 'Os metadados do ponto excedem o limite de leitura.')
      const count = await client.importSavePoint.count({ where: { userUid: uid, importId: id, saveId } })
      return { points, nextOffset: offset + points.length < count ? offset + points.length : null }
    },
    async readImportChunk(uid, id, pointId, index) {
      const row = await client.analysisChunk.findFirst({ where: { userUid: uid, analysisId: pointId, chunkIndex: index, analysis: { importId: id, state: 'ready', import: { state: 'ready' } } } })
      if (!row) throw notFound()
      return row.payload as unknown as number[][]
    },
    async removeImport(uid, id) {
      await client.$transaction(async tx => {
        await lockImport(tx, uid, id)
        await tx.measurementImport.delete({ where: importKey(uid, id) })
      })
    },
  }
}
