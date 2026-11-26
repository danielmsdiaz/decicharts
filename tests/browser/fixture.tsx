// Test-only entry. Vite production builds only index.html; this fixture is never shipped.
import { useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { User } from 'firebase/auth'
import { AuthContext } from '../../src/features/auth/auth-context'
import { App } from '../../src/app/App'
import { Dashboard } from '../../src/features/measurements/Dashboard'
import { ProtectedRoute } from '../../src/features/auth/ProtectedRoute'
import ProfilePage from '../../src/features/account/ProfilePage'
import AnalysesPage from '../../src/features/analyses/AnalysesPage'
import '../../src/styles.css'

function Fixture() {
  const [signedIn, setSignedIn] = useState(true)
  const guard = useRef<(() => boolean | Promise<boolean>) | null>(null)
  const extraGuards = useRef(new Set<() => boolean | Promise<boolean>>())
  const setLogoutGuard = useCallback((value: (() => boolean | Promise<boolean>) | null) => { guard.current = value }, [])
  const registerLogoutGuard = useCallback((value: () => boolean | Promise<boolean>) => { extraGuards.current.add(value); return () => { extraGuards.current.delete(value) } }, [])
  return <AuthContext.Provider value={{ user: signedIn ? { uid: 'fixture', displayName: 'Engenheira de teste', email: 'teste@example.invalid', photoURL: null, getIdToken: async () => 'fixture-token' } as unknown as User : null, loading: false, busy: false, configured: true, error: '', login: async () => setSignedIn(true), setLogoutGuard, registerLogoutGuard, logout: async () => { if (guard.current && !await guard.current()) return; for (const value of extraGuards.current) if (!await value()) return; setSignedIn(false) } }}><App /></AuthContext.Provider>
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><Routes><Route element={<Fixture />}><Route path="/login" element={<p>Sessão de teste encerrada</p>} /><Route element={<ProtectedRoute />}><Route path="/" element={<Dashboard />} /><Route path="/perfil" element={<ProfilePage />} /><Route path="/analises" element={<AnalysesPage />} /></Route></Route></Routes></MemoryRouter>)
