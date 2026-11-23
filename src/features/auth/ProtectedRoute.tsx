import { Navigate, Outlet, useOutletContext } from 'react-router'
import { useAuth } from './auth-context'
import { AccountProvider } from '@/features/account/AccountProvider'
import { WorkspaceProvider } from '@/features/analyses/WorkspaceProvider'

export function SessionLoading() {
  return <main className="mx-auto max-w-6xl px-6 py-16" aria-busy="true" aria-label="Recuperando sessão"><p className="mb-6 text-muted-foreground" role="status">Recuperando sua sessão…</p><div className="h-12 w-64 rounded-md bg-accent" /><div className="mt-8 h-80 rounded-xl bg-accent" /></main>
}
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const outletContext = useOutletContext()
  if (loading) return <SessionLoading />
  return user ? <AccountProvider key={user.uid}><WorkspaceProvider><Outlet context={outletContext} /></WorkspaceProvider></AccountProvider> : <Navigate to="/login" replace />
}
