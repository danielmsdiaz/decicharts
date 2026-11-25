import { useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/auth-context'
import type { Preferences, UserProfile } from '../../../shared/persistence'
import { AccountContext } from './account-context'

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    api<UserProfile>(user, 'profile', { signal: controller.signal }).then(setProfile).catch(issue => {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : 'Não foi possível carregar suas preferências.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [user, attempt])
  async function savePreferences(preferences: Preferences) {
    if (!user) return
    const result = await api<UserProfile>(user, 'profile', { method: 'PUT', body: JSON.stringify(preferences) })
    setProfile(result)
    setError('')
  }
  return <AccountContext.Provider value={{ profile, loading, error, savePreferences, retry: () => { setLoading(true); setError(''); setAttempt(value => value + 1) } }}>{children}</AccountContext.Provider>
}
