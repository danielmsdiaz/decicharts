import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useOutletContext } from 'react-router'
import type { User } from 'firebase/auth'
import { App } from '../src/app/App'
import { AuthContext, type AuthState } from '../src/features/auth/auth-context'
import { ProtectedRoute } from '../src/features/auth/ProtectedRoute'
import { Dashboard } from '../src/features/measurements/Dashboard'

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

function ThemeProbe() {
  const { theme } = useOutletContext<{ theme: string }>()
  return <output aria-label="Tema do dashboard">{theme}</output>
}

describe('dashboard na hierarquia real de rotas', () => {
  it('recebe o tema do App pela rota protegida e acompanha sua alteração', async () => {
    localStorage.setItem('decicharts-theme', 'light')
    const auth: AuthState = {
      user: { uid: 'test-user', displayName: 'Usuário de teste' } as User,
      loading: false, busy: false, configured: true, error: '',
      login: vi.fn(), logout: vi.fn(),
    }
    render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<App />}>
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<><Dashboard /><ThemeProbe /></>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(screen.getByRole('heading', { name: 'Análise de ruído' })).toBeDefined()
    expect(screen.getByLabelText('Tema do dashboard').textContent).toBe('light')
    await userEvent.click(screen.getByRole('button', { name: 'Ativar tema escuro' }))
    expect(screen.getByLabelText('Tema do dashboard').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
