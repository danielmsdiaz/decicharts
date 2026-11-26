import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import type { Analysis, Profile, PrismaClient } from './generated/prisma/client'
import type { AnalysisPage, AnalysisSummary, ChartView, DatasetMetadata, PointTuple, Preferences, StoredAnalysis, UserProfile } from '../shared/persistence'
import type { Identity } from './auth'
import { HttpError, notFound } from './errors'
import type { chunk } from './validation'
import { createPrismaClient, getPrismaClient } from './prisma'
import { createImportRepository, importKey, type ImportRepository } from './import-repository'

export interface AnalysisInput { id: string; name: string; metadata: DatasetMetadata; chart: ChartView }
export interface Repository extends ImportRepository {
  profile: (identity: Identity) => Promise<UserProfile>
  preferences: (identity: Identity, value: Preferences) => Promise<UserProfile>
  list: (uid: string, offset: number) => Promise<AnalysisPage>
  start: (identity: Identity, input: AnalysisInput) => Promise<{ id: string; state: string }>
  putChunk: (uid: string, id: string, index: number, value: ReturnType<typeof chunk>) => Promise<void>
  complete: (uid: string, id: string) => Promise<StoredAnalysis>
  read: (uid: string, id: string) => Promise<StoredAnalysis>
  readChunk: (uid: string, id: string, index: number) => Promise<PointTuple[]>
  update: (uid: string, id: string, name: string, chart: ChartView) => Promise<StoredAnalysis>
  remove: (uid: string, id: string) => Promise<void>
}

function summary(row: Analysis, chart: ChartView, name: string): AnalysisSummary {
  const metadata = row.metadata as unknown as DatasetMetadata
  return { id: row.id, name, fileName: metadata.fileName, count: row.recordCount,
    ...(metadata.schemaVersion === 2 ? { timeBasis: metadata.timeBasis ?? 'absolute', pointId: metadata.point?.id } : {}),
    start: Number(row.firstTs), end: Number(row.lastTs), unit: metadata.unit, timezone: metadata.timezone,
    updatedAt: row.updatedAt.toISOString(), chart }
}
function profile(row: Profile): UserProfile {
  return { uid: row.uid, name: row.name, email: row.email, photoURL: row.photoUrl, preferences: { timezone: row.timezone, unit: row.unit } }
}

export function createRepository(connection: string, client: PrismaClient = createPrismaClient(connection)): Repository {
  const ensureProfile = async (identity: Identity) => {
    const identityFields = { name: identity.name, email: identity.email, photoUrl: identity.photoURL }
    return profile(await client.profile.upsert({ where: { uid: identity.uid }, create: { uid: identity.uid, ...identityFields }, update: identityFields }))
  }
  const imports = createImportRepository(client, ensureProfile)
  async function unit(uid: string, id: string) {
    const row = await client.analysis.findUnique({ where: importKey(uid, id), include: { import: true } })
    if (!row) throw notFound()
    if (row.import.pointCount !== 1) throw new HttpError(409, 'Este ponto pertence a um conjunto. Use o salvamento da importação inteira.')
    return row
  }
  const repository: Repository = {
    ...imports,
    profile: ensureProfile,
    async preferences(identity, value) {
      return profile(await client.profile.upsert({ where: { uid: identity.uid },
        create: { uid: identity.uid, name: identity.name, email: identity.email, photoUrl: identity.photoURL, ...value },
        update: { ...value, updatedAt: new Date() } }))
    },
    // Legacy routes remain available for singleton imports. Multi-point writes
    // must always use the collection publication protocol.
    async list(uid, offset) {
      const where = { userUid: uid, state: 'ready', import: { state: 'ready', pointCount: 1 } }
      const [rows, total] = await client.$transaction([
        client.analysis.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: 20, skip: offset }),
        client.analysis.count({ where }),
      ])
      const analyses = await Promise.all(rows.map(row => repository.read(uid, row.id).then(value => value.analysis)))
      return { analyses, total, hasMore: offset + rows.length < total }
    },
    async start(identity, input) {
      await imports.startImport(identity, { id: input.id, name: input.name, fileName: input.metadata.fileName, sheetName: input.metadata.sheetName,
        pointCount: 1, recordCount: input.metadata.validRecords })
      const root = await client.measurementImport.findUniqueOrThrow({ where: importKey(identity.uid, input.id) })
      if (root.state === 'ready') {
        const row = await unit(identity.uid, input.id)
        if (!isDeepStrictEqual(row.metadata, input.metadata)) throw new HttpError(409, 'A análise já existe com outros metadados.')
        return { id: input.id, state: 'ready' }
      }
      await imports.startSave(identity.uid, input.id, { id: input.id, name: input.name, baseVersion: 0 })
      await imports.putImportPoint(identity.uid, input.id, input.id, input.id, { ordinal: 0, metadata: input.metadata, chart: input.chart })
      return { id: input.id, state: 'uploading' }
    },
    async putChunk(uid, id, index, value) {
      const row = await unit(uid, id)
      await imports.putImportChunk(uid, row.importId, row.importId, id, index, value)
    },
    async complete(uid, id) {
      const row = await unit(uid, id)
      if (row.import.state !== 'ready') {
        await imports.completeImportPoint(uid, row.importId, row.importId, id)
        await imports.completeSave(uid, row.importId, row.importId)
      }
      return repository.read(uid, id)
    },
    async read(uid, id) {
      const row = await unit(uid, id)
      if (row.state !== 'ready' || row.import.state !== 'ready' || !row.import.activeSaveId) throw notFound()
      const snapshot = await client.importSavePoint.findUniqueOrThrow({ where: { userUid_importId_saveId_pointId: {
        userUid: uid, importId: row.importId, saveId: row.import.activeSaveId, pointId: id } } })
      return { analysis: { ...summary(row, snapshot.chart as unknown as ChartView, row.import.name), updatedAt: row.import.updatedAt.toISOString() },
        metadata: row.metadata as unknown as DatasetMetadata, chunkCount: row.chunkCount }
    },
    async readChunk(uid, id, index) {
      const row = await unit(uid, id)
      return imports.readImportChunk(uid, row.importId, id, index) as Promise<PointTuple[]>
    },
    async update(uid, id, name, chart) {
      const row = await unit(uid, id)
      if (row.import.state !== 'ready') throw notFound()
      const saveId = randomUUID()
      await imports.startSave(uid, row.importId, { id: saveId, name, baseVersion: row.import.version })
      await imports.putImportPoint(uid, row.importId, saveId, id, { ordinal: 0, chart })
      await imports.completeSave(uid, row.importId, saveId)
      return repository.read(uid, id)
    },
    async remove(uid, id) {
      const row = await unit(uid, id)
      await imports.removeImport(uid, row.importId)
    },
  }
  return repository
}

let cached: { client: PrismaClient; repository: Repository } | undefined
export function getRepository() {
  const client = getPrismaClient()
  if (cached?.client !== client) cached = { client, repository: createRepository(process.env.DATABASE_URL!, client) }
  return cached.repository
}
