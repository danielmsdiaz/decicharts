import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { HttpError } from './errors'

export interface Identity { uid: string; name: string | null; email: string | null; photoURL: string | null }
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))

export function createAuthenticator(projectId: string, keys: JWTVerifyGetKey = googleKeys) {
  return async (request: Request): Promise<Identity> => {
    const authorization = request.headers.get('authorization') ?? ''
    const match = authorization.match(/^Bearer (\S{1,8192})$/)
    if (!match) throw new HttpError(401, 'Entre com Google para acessar suas análises.')
    if (!projectId) throw new HttpError(503, 'A autenticação do servidor precisa ser configurada.')
    try {
      const { payload } = await jwtVerify(match[1], keys, {
        algorithms: ['RS256'], audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
        requiredClaims: ['exp', 'iat', 'auth_time', 'sub'], clockTolerance: 5,
      })
      const provider = payload.firebase as { sign_in_provider?: string } | undefined
      const now = Date.now() / 1000
      if (!payload.sub || payload.sub.length > 128 || typeof payload.iat !== 'number' || payload.iat > now + 5 || typeof payload.auth_time !== 'number' || payload.auth_time < 0 || payload.auth_time > now + 5 || provider?.sign_in_provider !== 'google.com') throw new Error()
      return {
        uid: payload.sub,
        name: typeof payload.name === 'string' ? payload.name.slice(0, 200) : null,
        email: typeof payload.email === 'string' ? payload.email.slice(0, 320) : null,
        photoURL: typeof payload.picture === 'string' && payload.picture.startsWith('https://') ? payload.picture.slice(0, 2000) : null,
      }
    } catch (error) {
      if (error instanceof TypeError || (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_JWKS_TIMEOUT')) throw new HttpError(503, 'Não foi possível verificar sua sessão agora. Tente novamente.')
      throw new HttpError(401, 'Sua sessão expirou ou é inválida. Entre novamente com Google.')
    }
  }
}

export const authenticate = (request: Request) => createAuthenticator(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '')(request)
