import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRequest, MAX_BODY_BYTES } from './handler'

export async function handleNodeRequest(req: IncomingMessage & { body?: unknown; originalUrl?: string }, res: ServerResponse) {
  try {
    const headers = new Headers()
    for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
    let body: string | undefined
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
      if (req.body !== undefined) body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      else {
        const buffers: Buffer[] = []
        let length = 0
        for await (const value of req) {
          const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value)
          length += buffer.length
          if (length > MAX_BODY_BYTES) { res.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: 'Requisição acima do limite.' })); return }
          buffers.push(buffer)
        }
        body = Buffer.concat(buffers).toString('utf8')
      }
    }
    const request = new Request(new URL(req.originalUrl || req.url || '/', 'http://localhost'), { method: req.method, headers, body })
    const response = await handleRequest(request)
    response.headers.forEach((value, name) => res.setHeader(name, value))
    res.statusCode = response.status
    res.end(await response.text())
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ error: 'Não foi possível processar a requisição.' }))
  }
}
