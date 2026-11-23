import { createBrowserRouter, Navigate } from 'react-router'
import { lazy, Suspense } from 'react'
import { App } from './App'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute, SessionLoading } from '@/features/auth/ProtectedRoute'

const Dashboard = lazy(() => import('@/features/measurements/Dashboard').then(module => ({ default: module.Dashboard })))
const ProfilePage = lazy(() => import('@/features/account/ProfilePage'))
const AnalysesPage = lazy(() => import('@/features/analyses/AnalysesPage'))

export const router = createBrowserRouter([{ element: <App />, children: [
  { path: '/login', element: <LoginPage /> },
  { element: <ProtectedRoute />, children: [
    { path: '/', element: <Suspense fallback={<SessionLoading />}><Dashboard /></Suspense> },
    { path: '/perfil', element: <Suspense fallback={<SessionLoading />}><ProfilePage /></Suspense> },
    { path: '/analises', element: <Suspense fallback={<SessionLoading />}><AnalysesPage /></Suspense> },
  ] },
  { path: '*', element: <Navigate to="/" replace /> },
] }])
