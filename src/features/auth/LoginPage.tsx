import { Navigate } from 'react-router'
import { ChartNoAxesCombined, FileSpreadsheet, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-context'
import { SessionLoading } from './ProtectedRoute'

export function LoginPage() {
  const { user, loading, busy, error, configured, login } = useAuth()
  if (loading) return <SessionLoading />
  if (user) return <Navigate to="/" replace />
  return <main className="mx-auto grid min-h-[calc(100svh-78px)] max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.15fr_1fr] lg:gap-24">
    <section><div className="mb-8 inline-flex size-14 items-center justify-center rounded-xl bg-accent text-primary"><ChartNoAxesCombined className="size-7" aria-hidden="true" /></div><h1 className="max-w-xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">Suas medições.<br />Uma visão mais clara.</h1><p className="mt-6 max-w-lg leading-7 text-muted-foreground">Transforme planilhas de ruído em gráficos precisos para seus relatórios ambientais. Confira os dados, explore o período e exporte com clareza.</p><ul className="mt-8 space-y-4 text-sm"><li className="flex items-center gap-3"><FileSpreadsheet className="size-5 text-primary" aria-hidden="true" />Importação de Excel e CSV</li><li className="flex items-center gap-3"><ShieldCheck className="size-5 text-primary" aria-hidden="true" />Seus arquivos são processados no navegador</li></ul></section>
    <section className="panel p-7 sm:p-10" aria-labelledby="login-title"><h2 id="login-title" className="text-2xl font-semibold tracking-tight">Acesse seu espaço de análise</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Entre com sua conta Google para começar.</p><Button className="mt-8 w-full" variant="outline" onClick={() => void login()} disabled={!configured || busy}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3v2.6h3.3c1.9-1.8 3-4.4 3-7.5ZM12 22c2.7 0 5-.9 6.8-2.4l-3.3-2.6c-.9.6-2.1 1-3.5 1a6 6 0 0 1-5.7-4.2H2.9v2.7A10.2 10.2 0 0 0 12 22ZM6.3 13.8a6 6 0 0 1 0-3.6V7.5H2.9a10 10 0 0 0 0 9l3.4-2.7ZM12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.5 9.5 0 0 0 12 2a10.2 10.2 0 0 0-9.1 5.5l3.4 2.7A6 6 0 0 1 12 6Z" /></svg>{busy ? 'Conectando ao Google…' : 'Continuar com Google'}</Button>{error && <p role="alert" className="notice error mt-5">{error}</p>}<p className="mt-6 text-sm leading-6 text-muted-foreground">As planilhas são lidas no navegador. Ao clicar em Salvar análise, as medições ficam na sua conta para continuar depois.</p></section>
  </main>
}
