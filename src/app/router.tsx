import { createBrowserRouter, Navigate } from 'react-router'
import { lazy, Suspense } from 'react'
import { App } from './App'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { PageSkeleton } from '@/components/layout/LoadingStates'

const Dashboard = lazy(() => import('@/features/measurements/Dashboard').then(module => ({ default: module.Dashboard })))
const ProfilePage = lazy(() => import('@/features/account/ProfilePage'))
const AnalysesPage = lazy(() => import('@/features/analyses/AnalysesPage'))

export const router = createBrowserRouter([{ element: <App />, children: [
  { path: '/login', element: <LoginPage /> },
  { element: <ProtectedRoute />, children: [
    { path: '/', element: <Suspense fallback={<PageSkeleton page="analysis" />}><Dashboard /></Suspense> },
    { path: '/perfil', element: <Suspense fallback={<PageSkeleton page="profile" />}><ProfilePage /></Suspense> },
    { path: '/analises', element: <Suspense fallback={<PageSkeleton page="history" />}><AnalysesPage /></Suspense> },
  ] },
  { path: '*', element: <Navigate to="/" replace /> },
] }])
