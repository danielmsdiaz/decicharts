import { neon } from '@neondatabase/serverless'
import type { AnalysisPage, AnalysisSummary, ChartView, DatasetMetadata, PointTuple, Preferences, StoredAnalysis, UserProfile } from '../shared/persistence'
import { CHUNK_SIZE } from '../shared/persistence'
import type { Identity } from './auth'
import { HttpError, notFound } from './errors'
import type { chunk } from './validation'

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

type Row = Record<string, unknown>
function summary(row: Row): AnalysisSummary {
  const metadata = row.metadata as DatasetMetadata
  return { id: String(row.id), name: String(row.name), fileName: metadata.fileName,
    count: Number(row.record_count), start: Number(row.first_ts), end: Number(row.last_ts),
    unit: metadata.unit, timezone: metadata.timezone, updatedAt: new Date(String(row.updated_at)).toISOString(),
    chart: row.chart as ChartView }
}
function stored(row: Row): StoredAnalysis { return { analysis: summary(row), metadata: row.metadata as DatasetMetadata, chunkCount: Number(row.chunk_count) } }
function profile(row: Row): UserProfile {
  return { uid: String(row.uid), name: row.name as string | null, email: row.email as string | null, photoURL: row.photo_url as string | null, preferences: { timezone: String(row.timezone), unit: String(row.unit) } }
}

export function createRepository(connection: string): Repository {
  const sql = neon(connection)
  const repository: Repository = {
    async profile(identity) {
      const rows = await sql`INSERT INTO decicharts.profiles(uid, name, email, photo_url)
        VALUES (${identity.uid}, ${identity.name}, ${identity.email}, ${identity.photoURL})
        ON CONFLICT(uid) DO UPDATE SET name=excluded.name, email=excluded.email, photo_url=excluded.photo_url
        RETURNING *`
      return profile(rows[0])
    },
    async preferences(identity, value) {
      const rows = await sql`INSERT INTO decicharts.profiles(uid, name, email, photo_url, timezone, unit)
        VALUES (${identity.uid}, ${identity.name}, ${identity.email}, ${identity.photoURL}, ${value.timezone}, ${value.unit})
        ON CONFLICT(uid) DO UPDATE SET timezone=excluded.timezone, unit=excluded.unit, updated_at=now()
        RETURNING *`
      return profile(rows[0])
    },
    async list(uid, offset) {
      const rows = await sql`SELECT * FROM decicharts.analyses WHERE user_uid=${uid} AND state='ready' ORDER BY updated_at DESC, id LIMIT 20 OFFSET ${offset}`
      const totals = await sql`SELECT count(*)::integer AS total FROM decicharts.analyses WHERE user_uid=${uid} AND state='ready'`
      const total = Number(totals[0].total)
      return { analyses: rows.map(summary), total, hasMore: offset + rows.length < total }
    },
    async start(identity, input) {
      await repository.profile(identity)
      await sql`DELETE FROM decicharts.analyses WHERE user_uid=${identity.uid} AND state='uploading' AND updated_at < now() - interval '1 day'`
      const encodedMetadata = JSON.stringify(input.metadata)
      const rows = await sql`INSERT INTO decicharts.analyses(user_uid, id, name, metadata, chart, record_count, chunk_count)
        VALUES (${identity.uid}, ${input.id}::uuid, ${input.name}, ${encodedMetadata}::jsonb, ${JSON.stringify(input.chart)}::jsonb, ${input.metadata.validRecords}, ${Math.ceil(input.metadata.validRecords / CHUNK_SIZE)})
        ON CONFLICT(user_uid, id) DO UPDATE SET name=excluded.name, chart=excluded.chart, updated_at=now()
        WHERE analyses.state='uploading' AND analyses.metadata=excluded.metadata
        RETURNING id, state`
      if (rows.length) return { id: String(rows[0].id), state: String(rows[0].state) }
      const existing = await sql`SELECT id, state FROM decicharts.analyses WHERE user_uid=${identity.uid} AND id=${input.id}::uuid AND metadata=${encodedMetadata}::jsonb`
      if (!existing.length) throw new HttpError(409, 'Esta tentativa pertence a outro conjunto de dados. Importe novamente para salvar.')
      return { id: String(existing[0].id), state: String(existing[0].state) }
    },
    async putChunk(uid, id, index, value) {
      const rows = await sql`WITH target AS (
        SELECT * FROM decicharts.analyses WHERE user_uid=${uid} AND id=${id}::uuid AND state='uploading' FOR UPDATE
      ) INSERT INTO decicharts.analysis_chunks(user_uid, analysis_id, chunk_index, record_count, first_ts, last_ts, duplicate_count, payload)
        SELECT user_uid, id, ${index}, ${value.count}, ${value.first}, ${value.last}, ${value.duplicates}, ${JSON.stringify(value.points)}::jsonb FROM target
        WHERE ${index}::integer < chunk_count AND ${value.count}::integer=least(${CHUNK_SIZE}::integer, record_count - ${index}::integer * ${CHUNK_SIZE}::integer)
        ON CONFLICT(user_uid, analysis_id, chunk_index) DO UPDATE SET record_count=excluded.record_count, first_ts=excluded.first_ts, last_ts=excluded.last_ts, duplicate_count=excluded.duplicate_count, payload=excluded.payload
        RETURNING analysis_id`
      if (!rows.length) throw new HttpError(409, 'O bloco não corresponde à análise ou ela já foi concluída.')
    },
    async complete(uid, id) {
      const rows = await sql`WITH target AS (
          SELECT * FROM decicharts.analyses WHERE user_uid=${uid} AND id=${id}::uuid AND state='uploading' FOR UPDATE
        ), ordered AS (
          SELECT c.*, lag(c.last_ts) OVER (ORDER BY c.chunk_index) AS previous_last
          FROM decicharts.analysis_chunks c JOIN target t ON c.user_uid=t.user_uid AND c.analysis_id=t.id
        ), stats AS (
          SELECT count(*)::integer AS chunks, sum(record_count) AS records,
            min(first_ts) AS first_ts, max(last_ts) AS last_ts,
            bool_and(previous_last IS NULL OR first_ts >= previous_last) AS ordered,
            sum(duplicate_count + CASE WHEN first_ts=previous_last THEN 1 ELSE 0 END) AS duplicates
          FROM ordered
        ) UPDATE decicharts.analyses a SET state='ready', first_ts=s.first_ts, last_ts=s.last_ts, updated_at=now()
        FROM stats s, target t WHERE a.user_uid=t.user_uid AND a.id=t.id
          AND s.chunks=t.chunk_count AND s.records=t.record_count AND s.ordered
          AND s.duplicates=(t.metadata->>'duplicateTimestamps')::integer
          AND (t.chart->'range'->>'start')::bigint >= s.first_ts
          AND (t.chart->'range'->>'end')::bigint <= s.last_ts
        RETURNING a.*`
      if (rows.length) return stored(rows[0])
      const ready = await sql`SELECT * FROM decicharts.analyses WHERE user_uid=${uid} AND id=${id}::uuid AND state='ready'`
      if (ready.length) return stored(ready[0])
      throw new HttpError(409, 'O salvamento está incompleto ou os blocos não correspondem. Tente salvar novamente.')
    },
    async read(uid, id) {
      const rows = await sql`SELECT * FROM decicharts.analyses WHERE user_uid=${uid} AND id=${id}::uuid AND state='ready'`
      if (!rows.length) throw notFound()
      return stored(rows[0])
    },
    async readChunk(uid, id, index) {
      const rows = await sql`SELECT c.payload FROM decicharts.analysis_chunks c JOIN decicharts.analyses a ON a.user_uid=c.user_uid AND a.id=c.analysis_id
        WHERE c.user_uid=${uid} AND c.analysis_id=${id}::uuid AND c.chunk_index=${index} AND a.state='ready'`
      if (!rows.length) throw notFound()
      return rows[0].payload as PointTuple[]
    },
    async update(uid, id, name, chart) {
      const rows = await sql`UPDATE decicharts.analyses SET name=${name}, chart=${JSON.stringify(chart)}::jsonb, updated_at=now()
        WHERE user_uid=${uid} AND id=${id}::uuid AND state='ready'
          AND ${chart.range.start} >= first_ts AND ${chart.range.end} <= last_ts
        RETURNING *`
      if (!rows.length) {
        await repository.read(uid, id)
        throw new HttpError(400, 'O período deve estar dentro das medições salvas.')
      }
      return stored(rows[0])
    },
    async remove(uid, id) {
      const rows = await sql`DELETE FROM decicharts.analyses WHERE user_uid=${uid} AND id=${id}::uuid RETURNING id`
      if (!rows.length) throw notFound()
    },
  }
  return repository
}

let cached: { connection: string; repository: Repository } | undefined
export function getRepository() {
  const connection = process.env.DATABASE_URL
  if (!connection) throw new HttpError(503, 'O salvamento precisa da conexão Neon configurada no servidor.')
  if (cached?.connection !== connection) cached = { connection, repository: createRepository(connection) }
  return cached.repository
}
