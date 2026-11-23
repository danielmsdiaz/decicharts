import { authenticate, type Identity } from './auth'
import { getRepository, type Repository } from './repository'
import { HttpError } from './errors'
import * as validate from './validation'

export const MAX_BODY_BYTES = 512 * 1024
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}
async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Envie os dados em JSON.')
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new HttpError(413, 'Requisição acima do limite. Envie as medições em blocos menores.')
  try { return validate.object(JSON.parse(text)) }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'JSON inválido.') }
}

export function createHandler(dependencies: { authenticate: (request: Request) => Promise<Identity>; repository: () => Repository }) {
  return async (request: Request) => {
    try {
      const identity = await dependencies.authenticate(request)
      const repo = dependencies.repository()
      const url = new URL(request.url)
      const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
      const method = request.method
      if (parts[0] === 'profile' && parts.length === 1) {
        if (method === 'GET') return json(await repo.profile(identity))
        if (method === 'PUT') return json(await repo.preferences(identity, validate.preferences(await body(request))))
      }
      if (parts[0] === 'analyses') {
        if (parts.length === 1) {
          if (method === 'GET') {
            const offset = Number(url.searchParams.get('offset') || 0)
            if (!Number.isSafeInteger(offset) || offset < 0) throw new HttpError(400, 'Página inválida.')
            return json(await repo.list(identity.uid, offset))
          }
          if (method === 'POST') {
            const input = await body(request)
            return json(await repo.start(identity, { id: validate.uuid(input.id), name: validate.analysisName(input.name), metadata: validate.metadata(input.metadata), chart: validate.chartView(input.chart) }), 201)
          }
        }
        if (parts.length >= 2) {
          const id = validate.uuid(parts[1])
          if (parts.length === 2) {
            if (method === 'GET') return json(await repo.read(identity.uid, id))
            if (method === 'DELETE') { await repo.remove(identity.uid, id); return json({ deleted: true }) }
            if (method === 'PATCH') {
              const input = await body(request)
              return json(await repo.update(identity.uid, id, validate.analysisName(input.name), validate.chartView(input.chart)))
            }
          }
          if (parts[2] === 'chunks' && parts.length === 4) {
            const index = validate.chunkIndex(parts[3])
            if (method === 'GET') return json({ points: await repo.readChunk(identity.uid, id, index) })
            if (method === 'PUT') {
              const input = await body(request)
              await repo.putChunk(identity.uid, id, index, validate.chunk(input.points))
              return json({ stored: true })
            }
          }
          if (parts[2] === 'complete' && parts.length === 3 && method === 'POST') return json(await repo.complete(identity.uid, id))
        }
      }
      throw new HttpError(404, 'Endpoint não encontrado.')
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status)
      // Never return SQL, connection strings, tokens, or driver errors to the client.
      return json({ error: 'Não foi possível acessar os dados. Confira a conexão e as migrações do Neon e tente novamente.' }, 503)
    }
  }
}
export const handleRequest = createHandler({ authenticate, repository: getRepository })
