import { createContext, useContext } from 'react'
import type { Preferences, UserProfile } from '../../../shared/persistence'

export interface AccountState {
  profile: UserProfile | null
  loading: boolean
  error: string
  savePreferences: (preferences: Preferences) => Promise<void>
}
export const AccountContext = createContext<AccountState | null>(null)
export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount requer AccountProvider.')
  return context
}
