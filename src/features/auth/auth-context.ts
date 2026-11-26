import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'

export interface AuthState {
  user: User | null
  loading: boolean
  busy: boolean
  error: string
  configured: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  setLogoutGuard?: (guard: (() => boolean | Promise<boolean>) | null) => void
  registerLogoutGuard?: (guard: () => boolean | Promise<boolean>) => () => void
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requer AuthProvider.')
  return context
}
