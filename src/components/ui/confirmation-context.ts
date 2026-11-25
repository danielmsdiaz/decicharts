import { createContext, useContext } from 'react'

export interface ConfirmationOptions { title: string; description: string; confirmLabel: string; tone?: 'default' | 'danger' }
export type ConfirmAction = (options: ConfirmationOptions) => Promise<boolean>
export const ConfirmationContext = createContext<ConfirmAction | null>(null)
export function useConfirmation() {
  const confirm = useContext(ConfirmationContext)
  if (!confirm) throw new Error('useConfirmation requer ConfirmationProvider.')
  return confirm
}
