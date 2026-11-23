import type { User } from 'firebase/auth'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function api<T>(user: User, path: string, options: RequestInit = {}): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    options.signal?.throwIfAborted()
    let token: string
    try { token = await user.getIdToken(attempt === 1) }
    catch { throw new ApiError(401, 'Não foi possível recuperar a sessão. Entre novamente com Google.') }
    let response: Response
    const timeout = AbortSignal.timeout(30_000)
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
    try { response = await fetch(`/api/${path}`, { ...options, signal, headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${token}` } }) }
    catch {
      options.signal?.throwIfAborted()
      throw new ApiError(0, 'Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.')
    }
    if (response.status === 401 && attempt === 0) continue
    let result: unknown
    try { result = await response.json() }
    catch { throw new ApiError(response.status, 'A API não respondeu corretamente. Reinicie o servidor ou tente novamente.') }
    if (!response.ok) {
      const message = typeof result === 'object' && result && 'error' in result ? String(result.error) : 'Não foi possível concluir a operação.'
      throw new ApiError(response.status, message)
    }
    return result as T
  }
  throw new ApiError(401, 'Entre novamente com Google para continuar.')
}
