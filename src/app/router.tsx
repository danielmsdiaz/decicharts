import { createBrowserRouter, Navigate } from 'react-router'
import { App } from './App'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { Dashboard } from '@/features/measurements/Dashboard'

export const router = createBrowserRouter([{ element: <App />, children: [
  { path: '/login', element: <LoginPage /> },
  { element: <ProtectedRoute />, children: [{ path: '/', element: <Dashboard /> }] },
  { path: '*', element: <Navigate to="/" replace /> },
] }])
