import { isDeepStrictEqual } from 'node:util'
import type { Analysis, Profile, Prisma, PrismaClient } from './generated/prisma/client'
import type { AnalysisPage, AnalysisSummary, ChartView, DatasetMetadata, PointTuple, Preferences, StoredAnalysis, UserProfile } from '../shared/persistence'
import { CHUNK_SIZE } from '../shared/persistence'
import type { Identity } from './auth'
import { HttpError, notFound } from './errors'
import type { chunk } from './validation'
import { createPrismaClient, getPrismaClient } from './prisma'

export interface AnalysisInput { id: string; name: string; metadata: DatasetMetadata; chart: ChartView }
export interface Repository {
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

const asJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
const key = (userUid: string, id: string) => ({ userUid_id: { userUid, id } })

function summary(row: Analysis): AnalysisSummary {
  const metadata = row.metadata as unknown as DatasetMetadata
  return {
    id: row.id, name: row.name, fileName: metadata.fileName, count: row.recordCount,
    start: Number(row.firstTs), end: Number(row.lastTs), unit: metadata.unit,
    timezone: metadata.timezone, updatedAt: row.updatedAt.toISOString(),
    chart: row.chart as unknown as ChartView,
  }
}
function stored(row: Analysis): StoredAnalysis {
  return { analysis: summary(row), metadata: row.metadata as unknown as DatasetMetadata, chunkCount: row.chunkCount }
}
function profile(row: Profile): UserProfile {
  return { uid: row.uid, name: row.name, email: row.email, photoURL: row.photoUrl, preferences: { timezone: row.timezone, unit: row.unit } }
}

// Prisma has no typed SELECT FOR UPDATE. This is the only raw application query;
// values remain parameterized and all reads/writes below use typed model methods.
async function lockAnalysis(tx: Prisma.TransactionClient, uid: string, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM decicharts.analyses WHERE user_uid=${uid} AND id=${id}::uuid FOR UPDATE`
  return rows.length > 0
}

export function createRepository(connection: string, client: PrismaClient = createPrismaClient(connection)): Repository {
  const repository: Repository = {
    async profile(identity) {
      const identityFields = { name: identity.name, email: identity.email, photoUrl: identity.photoURL }
      return profile(await client.profile.upsert({ where: { uid: identity.uid }, create: { uid: identity.uid, ...identityFields }, update: identityFields }))
    },
    async preferences(identity, value) {
      return profile(await client.profile.upsert({
        where: { uid: identity.uid },
        create: { uid: identity.uid, name: identity.name, email: identity.email, photoUrl: identity.photoURL, ...value },
        update: { ...value, updatedAt: new Date() },
      }))
    },
    async list(uid, offset) {
      const where = { userUid: uid, state: 'ready' }
      const [rows, total] = await client.$transaction([
        client.analysis.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: 20, skip: offset }),
        client.analysis.count({ where }),
      ])
      return { analyses: rows.map(summary), total, hasMore: offset + rows.length < total }
    },
    async start(identity, input) {
      await repository.profile(identity)
      await client.analysis.deleteMany({ where: { userUid: identity.uid, state: 'uploading', updatedAt: { lt: new Date(Date.now() - 86_400_000) } } })
      return client.$transaction(async tx => {
        await tx.analysis.createMany({ data: [{
          userUid: identity.uid, id: input.id, name: input.name,
          metadata: asJson(input.metadata), chart: asJson(input.chart),
          recordCount: input.metadata.validRecords, chunkCount: Math.ceil(input.metadata.validRecords / CHUNK_SIZE),
        }], skipDuplicates: true })
        if (!await lockAnalysis(tx, identity.uid, input.id)) throw new HttpError(409, 'A análise foi alterada durante o salvamento. Tente novamente.')
        const existing = await tx.analysis.findUniqueOrThrow({ where: key(identity.uid, input.id) })
        if (!isDeepStrictEqual(existing.metadata, input.metadata)) throw new HttpError(409, 'Esta tentativa pertence a outro conjunto de dados. Importe novamente para salvar.')
        if (existing.state === 'uploading') await tx.analysis.update({ where: key(identity.uid, input.id), data: { name: input.name, chart: asJson(input.chart), updatedAt: new Date() } })
        return { id: existing.id, state: existing.state }
      })
    },
    async putChunk(uid, id, index, value) {
      return client.$transaction(async tx => {
        const locked = await lockAnalysis(tx, uid, id)
        const analysis = locked ? await tx.analysis.findUnique({ where: key(uid, id) }) : null
        if (!analysis || analysis.state !== 'uploading' || index >= analysis.chunkCount || value.count !== Math.min(CHUNK_SIZE, analysis.recordCount - index * CHUNK_SIZE)) throw new HttpError(409, 'O bloco não corresponde à análise ou ela já foi concluída.')
        const data = { recordCount: value.count, firstTs: BigInt(value.first), lastTs: BigInt(value.last), duplicateCount: value.duplicates, payload: asJson(value.points) }
        await tx.analysisChunk.upsert({
          where: { userUid_analysisId_chunkIndex: { userUid: uid, analysisId: id, chunkIndex: index } },
          create: { userUid: uid, analysisId: id, chunkIndex: index, ...data }, update: data,
        })
      })
    },
    async complete(uid, id) {
      return client.$transaction(async tx => {
        const conflict = () => new HttpError(409, 'O salvamento está incompleto ou os blocos não correspondem. Tente salvar novamente.')
        if (!await lockAnalysis(tx, uid, id)) throw conflict()
        const analysis = await tx.analysis.findUniqueOrThrow({ where: key(uid, id) })
        if (analysis.state === 'ready') return stored(analysis)
        const chunks = await tx.analysisChunk.findMany({
          where: { userUid: uid, analysisId: id }, orderBy: { chunkIndex: 'asc' },
          select: { chunkIndex: true, recordCount: true, firstTs: true, lastTs: true, duplicateCount: true },
        })
        if (chunks.length !== analysis.chunkCount || !chunks.length) throw conflict()
        let records = 0, duplicates = 0
        for (const [index, current] of chunks.entries()) {
          const previous = chunks[index - 1]
          if (current.chunkIndex !== index || (previous && current.firstTs < previous.lastTs)) throw conflict()
          records += current.recordCount
          duplicates += current.duplicateCount + (previous?.lastTs === current.firstTs ? 1 : 0)
        }
        const metadata = analysis.metadata as unknown as DatasetMetadata
        const chart = analysis.chart as unknown as ChartView
        const first = chunks[0].firstTs, last = chunks.at(-1)!.lastTs
        if (records !== analysis.recordCount || duplicates !== metadata.duplicateTimestamps || chart.range.start < Number(first) || chart.range.end > Number(last)) throw conflict()
        return stored(await tx.analysis.update({ where: key(uid, id), data: { state: 'ready', firstTs: first, lastTs: last, updatedAt: new Date() } }))
      })
    },
    async read(uid, id) {
      const row = await client.analysis.findFirst({ where: { userUid: uid, id, state: 'ready' } })
      if (!row) throw notFound()
      return stored(row)
    },
    async readChunk(uid, id, index) {
      const row = await client.analysisChunk.findFirst({ where: { userUid: uid, analysisId: id, chunkIndex: index, analysis: { state: 'ready' } }, select: { payload: true } })
      if (!row) throw notFound()
      return row.payload as PointTuple[]
    },
    async update(uid, id, name, chart) {
      const result = await client.analysis.updateMany({ where: { userUid: uid, id, state: 'ready', firstTs: { lte: BigInt(chart.range.start) }, lastTs: { gte: BigInt(chart.range.end) } }, data: { name, chart: asJson(chart), updatedAt: new Date() } })
      if (!result.count) {
        await repository.read(uid, id)
        throw new HttpError(400, 'O período deve estar dentro das medições salvas.')
      }
      return repository.read(uid, id)
    },
    async remove(uid, id) {
      const result = await client.analysis.deleteMany({ where: { userUid: uid, id } })
      if (!result.count) throw notFound()
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
