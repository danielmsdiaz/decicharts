import { afterEach, expect, it, vi } from 'vitest'
import type { User } from 'firebase/auth'
import { api } from '../src/lib/api'

afterEach(() => vi.unstubAllGlobals())
it('distingue falha temporária de token e sessão revogada', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  const token = vi.fn().mockRejectedValue({ code: 'auth/network-request-failed' })
  const user = { getIdToken: token } as unknown as User
  await expect(api(user, 'profile')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('conexão') })
  expect(fetch).not.toHaveBeenCalled()
  token.mockRejectedValue({ code: 'auth/user-token-expired' })
  await expect(api(user, 'profile')).rejects.toMatchObject({ status: 401 })
})
it('renova o token uma vez após 401 e mantém o fluxo após recuperação', async () => {
  const token = vi.fn().mockResolvedValue('synthetic-token')
  const fetch = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401 })).mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
  vi.stubGlobal('fetch', fetch)
  await expect(api({ getIdToken: token } as unknown as User, 'profile')).resolves.toEqual({ ok: true })
  expect(token.mock.calls).toEqual([[false], [true]])
})
