import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from 'firebase/auth'
import { AuthProvider } from '../src/features/auth/AuthProvider'
import { useAuth } from '../src/features/auth/auth-context'

const firebase = vi.hoisted(() => ({
  setPersistence: vi.fn(), signInWithPopup: vi.fn(), signOut: vi.fn(), unsubscribe: vi.fn(),
  listener: null as ((user: User | null) => void) | null,
  errorListener: null as ((error: unknown) => void) | null,
}))
vi.mock('../src/lib/firebase', () => ({ firebaseAuth: { name: 'test-only' }, firebaseConfigurationError: '' }))
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {}, browserLocalPersistence: 'local',
  setPersistence: firebase.setPersistence, signInWithPopup: firebase.signInWithPopup, signOut: firebase.signOut,
  onAuthStateChanged: (_auth: unknown, listener: typeof firebase.listener, errorListener: typeof firebase.errorListener) => { firebase.listener = listener; firebase.errorListener = errorListener; return firebase.unsubscribe },
}))

function Probe() {
  const { user, loading, busy, login, logout, error, setLogoutGuard } = useAuth()
  return <><p>{loading ? 'Recuperando' : user?.email || 'Visitante'}</p><p role="alert">{error}</p><button disabled={busy} onClick={() => void login()}>Login</button><button disabled={busy} onClick={() => void logout()}>Logout</button><button onClick={() => setLogoutGuard?.(() => false)}>Proteger saída</button><button onClick={() => setLogoutGuard?.(null)}>Liberar saída</button></>
}
beforeEach(() => {
  firebase.setPersistence.mockReset().mockResolvedValue(undefined)
  firebase.signInWithPopup.mockReset().mockResolvedValue(undefined)
  firebase.signOut.mockReset().mockResolvedValue(undefined)
  firebase.unsubscribe.mockReset()
})
afterEach(cleanup)

describe('Firebase Authentication', () => {
  it('não encerra a conta quando o usuário cancela a saída protegida', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    act(() => firebase.listener?.({ uid: '1', email: 'engenheiro@example.invalid' } as User))
    await userEvent.click(screen.getByText('Proteger saída'))
    await userEvent.click(screen.getByText('Logout'))
    expect(firebase.signOut).not.toHaveBeenCalled()
    expect(screen.getByText('engenheiro@example.invalid')).toBeDefined()
    await userEvent.click(screen.getByText('Liberar saída'))
    await userEvent.click(screen.getByText('Logout'))
    expect(firebase.signOut).toHaveBeenCalledOnce()
  })
  it('recupera sessão, configura persistência e encerra sessão com limpeza de usuário', async () => {
    const result = render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByText('Recuperando')).toBeDefined()
    expect(firebase.setPersistence).toHaveBeenCalledWith(expect.anything(), 'local')
    act(() => firebase.listener?.({ uid: '1', email: 'engenheiro@example.invalid' } as User))
    expect(screen.getByText('engenheiro@example.invalid')).toBeDefined()
    await userEvent.click(screen.getByText('Logout'))
    await waitFor(() => expect(screen.getByText('Visitante')).toBeDefined())
    expect(firebase.signOut).toHaveBeenCalledOnce()
    result.unmount()
    expect(firebase.unsubscribe).toHaveBeenCalledOnce()
  })
  it('executa popup Google e traduz seu cancelamento', async () => {
    firebase.signInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' })
    render(<AuthProvider><Probe /></AuthProvider>)
    act(() => firebase.listener?.(null))
    await userEvent.click(screen.getByText('Login'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('foi fechada'))
    expect(firebase.signInWithPopup).toHaveBeenCalledOnce()
    expect(screen.getByText('Visitante')).toBeDefined()
  })
  it('mantém sessão quando o logout falha e informa erro de rede', async () => {
    firebase.signOut.mockRejectedValue({ code: 'auth/network-request-failed' })
    render(<AuthProvider><Probe /></AuthProvider>)
    act(() => firebase.listener?.({ uid: '1', email: 'engenheiro@example.invalid' } as User))
    await userEvent.click(screen.getByText('Logout'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('conexão'))
    expect(screen.getByText('engenheiro@example.invalid')).toBeDefined()
  })
  it('informa falha da persistência sem perder observação da sessão', async () => {
    firebase.setPersistence.mockRejectedValue({ code: 'auth/web-storage-unsupported' })
    render(<AuthProvider><Probe /></AuthProvider>)
    act(() => firebase.listener?.(null))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('armazenamento'))
    act(() => firebase.listener?.({ uid: '1', email: 'engenheiro@example.invalid' } as User))
    expect(screen.getByText('engenheiro@example.invalid')).toBeDefined()
  })
  it('termina carregamento e informa falha de recuperação da sessão', () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    act(() => firebase.errorListener?.({ code: 'auth/invalid-api-key' }))
    expect(screen.getByText('Visitante')).toBeDefined()
    expect(screen.getByRole('alert').textContent).toContain('chave do Firebase')
  })
})
