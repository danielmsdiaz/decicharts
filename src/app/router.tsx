import { createBrowserRouter, Navigate } from 'react-router'
import { App } from './App'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'

export const router = createBrowserRouter([{ element: <App />, children: [
  { path: '/login', element: <LoginPage /> },
  { element: <ProtectedRoute />, children: [{ path: '/', element: <main className="mx-auto max-w-6xl px-6 py-12"><h1 className="text-3xl font-semibold">Análise de ruído</h1><p className="mt-4 text-muted-foreground">Sessão autenticada. Importação e gráficos serão adicionados nas próximas etapas.</p></main> }] },
  { path: '*', element: <Navigate to="/" replace /> },
] }])
