import { Navigate, Outlet, useOutletContext } from 'react-router'
import { useAuth } from './auth-context'
import { AccountProvider } from '@/features/account/AccountProvider'
import { WorkspaceProvider } from '@/features/analyses/WorkspaceProvider'
import { PageSkeleton } from '@/components/layout/LoadingStates'
import { ReportProvider } from '@/features/reports/ReportProvider'

export function SessionLoading() {
  return <PageSkeleton />
}
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const outletContext = useOutletContext()
  if (loading) return <SessionLoading />
  return user ? <AccountProvider key={user.uid}><WorkspaceProvider><ReportProvider><Outlet context={outletContext} /></ReportProvider></WorkspaceProvider></AccountProvider> : <Navigate to="/login" replace />
}
