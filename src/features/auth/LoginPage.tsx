import { Navigate } from 'react-router'
import { AudioLines } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-context'
import { SessionLoading } from './ProtectedRoute'

export function LoginPage() {
  const { user, loading, busy, error, configured, login } = useAuth()
  if (loading) return <SessionLoading />
  if (user) return <Navigate to="/" replace />
  return <main className="login-shell"><section className="login-content" aria-labelledby="login-title"><AudioLines className="login-mark" aria-hidden="true" /><h1 id="login-title">Entre no Decicharts</h1><p className="login-intro">Análise de ruído ambiental</p><Button className="mt-8 w-full" variant="outline" onClick={() => void login()} disabled={!configured || busy}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3v2.6h3.3c1.9-1.8 3-4.4 3-7.5ZM12 22c2.7 0 5-.9 6.8-2.4l-3.3-2.6c-.9.6-2.1 1-3.5 1a6 6 0 0 1-5.7-4.2H2.9v2.7A10.2 10.2 0 0 0 12 22ZM6.3 13.8a6 6 0 0 1 0-3.6V7.5H2.9a10 10 0 0 0 0 9l3.4-2.7ZM12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.5 9.5 0 0 0 12 2a10.2 10.2 0 0 0-9.1 5.5l3.4 2.7A6 6 0 0 1 12 6Z" /></svg>{busy ? 'Conectando ao Google…' : 'Continuar com Google'}</Button>{error && <p role="alert" className="notice error mt-5">{error}</p>}<p className="login-note">Use sua conta Google para acessar suas análises.</p></section>
  </main>
}
