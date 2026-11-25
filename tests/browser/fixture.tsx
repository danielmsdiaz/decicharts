// Test-only entry. Vite production builds only index.html; this fixture is never shipped.
import { useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import type { User } from 'firebase/auth'
import { AuthContext } from '../../src/features/auth/auth-context'
import { Header } from '../../src/components/layout/Header'
import { Dashboard } from '../../src/features/measurements/Dashboard'
import { useTheme } from '../../src/hooks/use-theme'
import { ProtectedRoute } from '../../src/features/auth/ProtectedRoute'
import ProfilePage from '../../src/features/account/ProfilePage'
import AnalysesPage from '../../src/features/analyses/AnalysesPage'
import '../../src/styles.css'

function Fixture() {
  const [signedIn, setSignedIn] = useState(true)
  const guard = useRef<(() => boolean) | null>(null)
  const setLogoutGuard = useCallback((value: (() => boolean) | null) => { guard.current = value }, [])
  const { theme, toggleTheme } = useTheme()
  return <AuthContext.Provider value={{ user: signedIn ? { uid: 'fixture', displayName: 'Engenheira de teste', email: 'teste@example.invalid', photoURL: null, getIdToken: async () => 'fixture-token' } as unknown as User : null, loading: false, busy: false, configured: true, error: '', login: async () => setSignedIn(true), setLogoutGuard, logout: async () => { if (!guard.current || guard.current()) setSignedIn(false) } }}><Header theme={theme} toggleTheme={toggleTheme} />{signedIn ? <Outlet context={{ theme }} /> : <p>Sessão de teste encerrada</p>}</AuthContext.Provider>
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><Routes><Route element={<Fixture />}><Route element={<ProtectedRoute />}><Route path="/" element={<Dashboard />} /><Route path="/perfil" element={<ProfilePage />} /><Route path="/analises" element={<AnalysesPage />} /></Route></Route></Routes></MemoryRouter>)
