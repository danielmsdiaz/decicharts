import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { GoogleAuthProvider, browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithPopup, signOut, type User } from 'firebase/auth'
import { firebaseAuth, firebaseConfigurationError } from '@/lib/firebase'
import { AuthContext } from './auth-context'

function authMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/popup-closed-by-user': 'A janela de login foi fechada. Tente novamente quando quiser.',
    'auth/cancelled-popup-request': 'O login anterior foi cancelado. Tente novamente.',
    'auth/popup-blocked': 'O navegador bloqueou o popup. Permita popups para este site e tente novamente.',
    'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase. Confira Authentication → Settings → Authorized domains.',
    'auth/network-request-failed': 'Não foi possível conectar ao Google. Confira sua conexão e tente novamente.',
    'auth/operation-not-allowed': 'Ative o provedor Google no Firebase Authentication.',
    'auth/invalid-api-key': 'A chave do Firebase é inválida. Revise a configuração do projeto.',
    'auth/web-storage-unsupported': 'O navegador não permite persistir a sessão. Habilite o armazenamento deste site.',
  }
  return messages[code] ?? 'Não foi possível concluir a autenticação. Confira a configuração e tente novamente.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const logoutGuard = useRef<(() => boolean) | null>(null)
  const setLogoutGuard = useCallback((guard: (() => boolean) | null) => { logoutGuard.current = guard }, [])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(firebaseAuth))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(firebaseConfigurationError)
  useEffect(() => {
    if (!firebaseAuth) return
    const auth = firebaseAuth
    let active = true
    const unsubscribe = onAuthStateChanged(auth, next => { if (active) { setUser(next); setLoading(false) } }, issue => { if (active) { setError(authMessage(issue)); setLoading(false) } })
    setPersistence(auth, browserLocalPersistence).catch(issue => { if (active) setError(authMessage(issue)) })
    return () => { active = false; unsubscribe() }
  }, [])

  async function login() {
    if (!firebaseAuth || busy) return
    setBusy(true); setError('')
    try { await setPersistence(firebaseAuth, browserLocalPersistence); await signInWithPopup(firebaseAuth, new GoogleAuthProvider()) }
    catch (issue) { setError(authMessage(issue)) }
    finally { setBusy(false) }
  }
  async function logout() {
    if (!firebaseAuth || busy) return
    if (logoutGuard.current && !logoutGuard.current()) return
    setBusy(true); setError('')
    try { await signOut(firebaseAuth); setUser(null) }
    catch (issue) { setError(authMessage(issue)) }
    finally { setBusy(false) }
  }
  return <AuthContext.Provider value={{ user, loading, busy, error, configured: Boolean(firebaseAuth), login, logout, setLogoutGuard }}>{children}</AuthContext.Provider>
}
