import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthContext, type AuthState } from '../src/features/auth/auth-context'
import { ProtectedRoute } from '../src/features/auth/ProtectedRoute'
import { LoginPage } from '../src/features/auth/LoginPage'
import type { User } from 'firebase/auth'

afterEach(cleanup)
const state = (overrides: Partial<AuthState> = {}): AuthState => ({ user: null, loading: false, busy: false, error: '', configured: true, login: vi.fn(), logout: vi.fn(), ...overrides })
function protectedPage(auth: AuthState) {
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/']}><Routes><Route element={<ProtectedRoute />}><Route path="/" element={<p>Dashboard privado</p>} /></Route><Route path="/login" element={<p>Login necessário</p>} /></Routes></MemoryRouter></AuthContext.Provider>)
}
describe('acesso e login', () => {
  it('aguarda recuperação da sessão antes de exibir dados ou redirecionar', () => {
    protectedPage(state({ loading: true }))
    expect(screen.getByRole('status').textContent).toContain('Recuperando')
    expect(screen.queryByText('Dashboard privado')).toBeNull()
    expect(screen.queryByText('Login necessário')).toBeNull()
  })
  it('redireciona visitantes sem sessão', () => {
    protectedPage(state())
    expect(screen.getByText('Login necessário')).toBeDefined()
  })
  it('permite sessão autenticada', () => {
    protectedPage(state({ user: { uid: 'test-user' } as User }))
    expect(screen.getByText('Dashboard privado')).toBeDefined()
  })
  it('desabilita login sem configuração e mostra instrução', () => {
    render(<AuthContext.Provider value={state({ configured: false, error: 'Configure o Firebase.' })}><MemoryRouter><LoginPage /></MemoryRouter></AuthContext.Provider>)
    expect((screen.getByRole('button', { name: /Continuar com Google/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toContain('Configure')
  })
  it('aciona login e mostra erro de popup sem abrir a rota privada', async () => {
    const login = vi.fn()
    render(<AuthContext.Provider value={state({ login, error: 'A janela de login foi fechada.' })}><MemoryRouter><LoginPage /></MemoryRouter></AuthContext.Provider>)
    await userEvent.click(screen.getByRole('button', { name: /Continuar com Google/ }))
    expect(login).toHaveBeenCalledOnce()
    expect(screen.getByRole('alert').textContent).toContain('fechada')
  })
})
