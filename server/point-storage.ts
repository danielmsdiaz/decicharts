import type { Analysis, Prisma } from './generated/prisma/client'
import type { ChartView, DatasetMetadata } from '../shared/persistence'
import { CHUNK_SIZE } from '../shared/persistence'
import { HttpError } from './errors'
import type { chunk } from './validation'

export async function writePointChunk(tx: Prisma.TransactionClient, row: Analysis, index: number, value: ReturnType<typeof chunk>) {
  if (row.state !== 'uploading' || index >= row.chunkCount || value.count !== Math.min(CHUNK_SIZE, row.recordCount - index * CHUNK_SIZE)
    || ((row.metadata as unknown as DatasetMetadata).timeBasis === 'elapsed' && value.first < 0)) throw new HttpError(409, 'O bloco não corresponde ao ponto em envio.')
  const key = { userUid: row.userUid, analysisId: row.id, chunkIndex: index }
  const payload = JSON.parse(JSON.stringify(value.points)) as Prisma.InputJsonValue
  const existing = await tx.analysisChunk.findUnique({ where: { userUid_analysisId_chunkIndex: key } })
  if (existing && JSON.stringify(existing.payload) !== JSON.stringify(payload)) throw new HttpError(409, 'O bloco já recebido tem outro conteúdo. Reimporte para iniciar outra análise.')
  await tx.analysisChunk.upsert({ where: { userUid_analysisId_chunkIndex: key }, create: { ...key, payload, recordCount: value.count,
    firstTs: BigInt(value.first), lastTs: BigInt(value.last), duplicateCount: value.duplicates }, update: {} })
}

export function checkRange(row: Analysis, chart: ChartView) {
  if (row.firstTs === null || row.lastTs === null || chart.range.start < Number(row.firstTs) || chart.range.end > Number(row.lastTs)) {
    throw new HttpError(400, 'O período deve estar dentro das medições do ponto.')
  }
}

export async function sealPoint(tx: Prisma.TransactionClient, row: Analysis, chart: ChartView) {
  if (row.state === 'ready') { checkRange(row, chart); return }
  const conflict = () => new HttpError(409, 'O ponto está incompleto ou seus blocos não correspondem. Tente salvar novamente.')
  const chunks = await tx.analysisChunk.findMany({ where: { userUid: row.userUid, analysisId: row.id }, orderBy: { chunkIndex: 'asc' },
    select: { chunkIndex: true, recordCount: true, firstTs: true, lastTs: true, duplicateCount: true } })
  if (chunks.length !== row.chunkCount || !chunks.length) throw conflict()
  let records = 0, duplicates = 0
  for (const [index, current] of chunks.entries()) {
    const previous = chunks[index - 1]
    if (current.chunkIndex !== index || (previous && current.firstTs < previous.lastTs)) throw conflict()
    records += current.recordCount
    duplicates += current.duplicateCount + (previous?.lastTs === current.firstTs ? 1 : 0)
  }
  const metadata = row.metadata as unknown as DatasetMetadata
  const firstTs = chunks[0].firstTs, lastTs = chunks.at(-1)!.lastTs
  if (records !== row.recordCount || duplicates !== metadata.duplicateTimestamps) throw conflict()
  checkRange({ ...row, firstTs, lastTs }, chart)
  await tx.analysis.update({ where: { userUid_id: { userUid: row.userUid, id: row.id } }, data: { state: 'ready', firstTs, lastTs } })
}
