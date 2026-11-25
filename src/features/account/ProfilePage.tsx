import { useState } from 'react'
import { Save, UserRound } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { DEFAULT_PREFERENCES, type Preferences } from '../../../shared/persistence'
import { useAccount } from './account-context'

function PreferencesForm({ initial, onSaved }: { initial: Preferences; onSaved: () => void }) {
  const { savePreferences } = useAccount()
  const [timezone, setTimezone] = useState(initial.timezone)
  const [unit, setUnit] = useState(initial.unit)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit() {
    setBusy(true); setError('')
    try { await savePreferences({ timezone, unit }); onSaved() }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'Não foi possível salvar as preferências.') }
    finally { setBusy(false) }
  }
  return <form className="mt-6" onSubmit={event => { event.preventDefault(); void submit() }}>
    <fieldset disabled={busy} className="grid max-w-2xl gap-5 sm:grid-cols-2"><legend className="sr-only">Preferências de importação</legend>
      <label className="field">Fuso horário padrão<Input required value={timezone} onChange={event => setTimezone(event.target.value)} list="profile-timezones" /><datalist id="profile-timezones">{['America/Recife', 'America/Sao_Paulo', 'America/Manaus', 'America/Rio_Branco', 'UTC', 'Europe/Lisbon'].map(zone => <option value={zone} key={zone} />)}</datalist></label>
      <label className="field">Unidade padrão<Input required value={unit} maxLength={30} onChange={event => setUnit(event.target.value)} /></label>
    </fieldset>
    {error && <p className="notice error mt-5" role="alert">{error}</p>}
    <Button className="mt-6" type="submit" disabled={busy}><Save />{busy ? 'Salvando…' : 'Salvar preferências'}</Button>
  </form>
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { profile, loading, error, retry } = useAccount()
  const [feedback, setFeedback] = useState('')
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const prefs = profile?.preferences ?? DEFAULT_PREFERENCES
  return <main className="dashboard-shell">
    <div><h1 className="text-3xl font-semibold tracking-tight">Meu perfil</h1></div>
    <section className="profile-identity"><div className="flex items-center gap-4">{user?.photoURL && user.photoURL !== failedPhoto ? <img src={user.photoURL} alt={user.displayName || 'Foto da conta Google'} className="size-14 rounded-full" referrerPolicy="no-referrer" onError={() => setFailedPhoto(user.photoURL)} /> : <span className="file-symbol"><UserRound aria-hidden="true" /></span>}<div className="min-w-0"><h2 className="break-words font-semibold">{user?.displayName || 'Conta Google'}</h2><p className="mt-1 break-all text-sm text-muted-foreground">{user?.email}</p></div></div><span className="account-source">Conta Google<HelpTooltip label="Sobre os dados da conta">Nome, foto e e-mail são fornecidos pela sua conta Google.</HelpTooltip></span></section>
    <section className="profile-settings" aria-busy={loading}><div className="field-label"><h2 className="text-lg font-semibold">Preferências de leitura</h2><HelpTooltip label="Sobre as preferências">Aplicadas às próximas importações. As análises já abertas ou salvas mantêm o fuso e a unidade originais.</HelpTooltip></div>
      {error && <div role="alert" className="notice error mt-5"><p>{error}</p><Button className="mt-3" variant="outline" onClick={retry}>Tentar carregar preferências novamente</Button></div>}
      {loading ? <p role="status" className="mt-6 text-sm text-muted-foreground">Carregando preferências…</p> : <PreferencesForm key={`${prefs.timezone}|${prefs.unit}`} initial={prefs} onSaved={() => setFeedback('Preferências salvas na sua conta.')} />}
      {feedback && <p role="status" className="mt-5 text-sm text-primary">{feedback}</p>}
    </section>
  </main>
}
