// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { createAuthenticator } from '../server/auth'

let keys: Awaited<ReturnType<typeof generateKeyPair>>
let authenticate: ReturnType<typeof createAuthenticator>
beforeAll(async () => {
  keys = await generateKeyPair('RS256')
  const publicKey = { ...await exportJWK(keys.publicKey), kid: 'test-key', alg: 'RS256' }
  authenticate = createAuthenticator('test-project', createLocalJWKSet({ keys: [publicKey] }))
})
async function token(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ auth_time: now, firebase: { sign_in_provider: 'google.com' }, name: 'Alice', email: 'alice@example.invalid', aud: 'test-project', iss: 'https://securetoken.google.com/test-project', sub: 'alice', iat: now, exp: now + 3600, ...overrides }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).sign(keys.privateKey)
}
describe('tokens Firebase na API', () => {
  it('aceita apenas identidade assinada com projeto e provedor corretos', async () => {
    const request = new Request('https://app.invalid/api/profile', { headers: { authorization: `Bearer ${await token()}` } })
    expect(await authenticate(request)).toMatchObject({ uid: 'alice', name: 'Alice', email: 'alice@example.invalid' })
  })
  it.each([
    { aud: 'outro-projeto' }, { iss: 'https://outro.invalid' }, { exp: 1 },
    { auth_time: 999999999999 }, { iat: 999999999999 }, { sub: '' },
    { firebase: { sign_in_provider: 'password' } }, { auth_time: undefined },
  ])('rejeita claims inválidas: %j', async claims => {
    await expect(authenticate(new Request('https://app.invalid/api/profile', { headers: { authorization: `Bearer ${await token(claims)}` } }))).rejects.toMatchObject({ status: 401 })
  })
  it('rejeita token ausente, malformado e assinatura adulterada', async () => {
    for (const authorization of ['', 'Bearer falso', `Bearer ${(await token()).slice(0, -15)}invalidsignature`]) {
      await expect(authenticate(new Request('https://app.invalid/api/profile', { headers: { authorization } }))).rejects.toMatchObject({ status: 401 })
    }
  })
})
